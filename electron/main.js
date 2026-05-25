const path = require("path");
const fs = require("fs");
const { execFile, execFileSync, spawn } = require("child_process");
const { app, BrowserWindow, BrowserView, ipcMain, session, shell } = require("electron");

const defaultBrowserHomeUrl = "https://accounts.google.com/";
const defaultGoogleLoginUrl = "https://accounts.google.com/";

let mainWindow;
let activeProfileId = null;
let browserBounds = null;
const backendViews = new Map();
const profileRegistry = new Map();
const launchedChromeProfiles = new Map();

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1180,
    minHeight: 760,
    title: "CrossDesk",
    backgroundColor: "#f5f6f8",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "..", "index.html"));
  mainWindow.on("resize", layoutActiveBackendView);
  mainWindow.on("move", layoutActiveBackendView);
  mainWindow.on("closed", () => {
    mainWindow = null;
    backendViews.clear();
    profileRegistry.clear();
  });
}

function normalizeProfile(profile) {
  if (!profile || typeof profile !== "object" || !profile.id) {
    return null;
  }
  return {
    id: String(profile.id),
    name: String(profile.name || profile.id),
    platform: "System Chrome",
    market: "本机隔离",
    partition: String(profile.partition || `persist:crossdesk-${profile.id}`),
    debugPort: Number(profile.debugPort) || profileDebugPort(profile),
    loginUrl: defaultGoogleLoginUrl,
    homeUrl: defaultBrowserHomeUrl
  };
}

function registerProfile(profile) {
  const normalized = normalizeProfile(profile);
  if (!normalized) {
    return null;
  }
  profileRegistry.set(normalized.id, normalized);
  return normalized;
}

function getProfile(profileOrId) {
  if (typeof profileOrId === "object") {
    return registerProfile(profileOrId);
  }
  return profileRegistry.get(String(profileOrId || activeProfileId));
}

function normalizeBrowserUrl(input) {
  const raw = String(input || "").trim();
  if (!raw) {
    return null;
  }
  if (/^[\w.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(raw) || /^localhost([/:?#].*)?$/i.test(raw)) {
    return `https://${raw}`;
  }
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return `https://www.google.com/search?q=${encodeURIComponent(raw)}`;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }
  return parsed.toString();
}

function canLoadRemoteUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function chromeExecutableCandidates() {
  const candidates = [];
  if (process.env.CHROME_PATH) {
    candidates.push(process.env.CHROME_PATH);
  }
  if (process.platform === "win32") {
    candidates.push(
      path.join(process.env.PROGRAMFILES || "C:\\Program Files", "Google", "Chrome", "Application", "chrome.exe"),
      path.join(process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)", "Google", "Chrome", "Application", "chrome.exe"),
      path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "Application", "chrome.exe")
    );
  } else if (process.platform === "darwin") {
    candidates.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
  } else {
    candidates.push("google-chrome", "google-chrome-stable", "chromium", "chromium-browser");
  }
  return candidates.filter(Boolean);
}

function chromePathFromWindowsRegistry() {
  if (process.platform !== "win32") {
    return null;
  }
  const roots = ["HKCU", "HKLM"];
  for (const root of roots) {
    try {
      const output = execFileSync("reg", [
        "query",
        `${root}\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe`,
        "/ve"
      ], { encoding: "utf8", windowsHide: true });
      const match = output.match(/REG_\w+\s+(.+chrome\.exe)\s*$/im);
      if (match?.[1] && fs.existsSync(match[1].trim())) {
        return match[1].trim();
      }
    } catch {
      // Registry key is optional; keep trying known install locations.
    }
  }
  return null;
}

function findChromeExecutable() {
  const registryPath = chromePathFromWindowsRegistry();
  if (registryPath) {
    return registryPath;
  }
  if (process.platform === "linux") {
    return chromeExecutableCandidates()[0];
  }
  return chromeExecutableCandidates().find((candidate) => fs.existsSync(candidate)) || null;
}

function browserIdentityRoot() {
  return path.join(app.getPath("userData"), "chrome-identities");
}

function safeIdentityId(id) {
  return String(id || "profile").replace(/[^a-z0-9._-]/gi, "_").slice(0, 80) || "profile";
}

function profileDebugPort(profile) {
  if (Number(profile.debugPort)) {
    return Number(profile.debugPort);
  }
  let hash = 0;
  for (const char of String(profile.id || "")) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  }
  return 43000 + (Math.abs(hash) % 2000);
}

function chromeProfileDir(profile) {
  const root = path.resolve(browserIdentityRoot());
  const target = path.resolve(root, safeIdentityId(profile.id));
  const rootWithSep = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (!target.toLowerCase().startsWith(rootWithSep.toLowerCase())) {
    throw new Error("Invalid browser identity directory");
  }
  return target;
}

function psSingleQuoted(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function encodedPowerShell(command) {
  return Buffer.from(command, "utf16le").toString("base64");
}

async function openSystemChrome(profile, input) {
  const url = normalizeBrowserUrl(input || profile.loginUrl || profile.homeUrl || defaultGoogleLoginUrl);
  if (!url) {
    return { ok: false, reason: "UNSUPPORTED_URL" };
  }

  const profileDir = chromeProfileDir(profile);
  const debugPort = profileDebugPort(profile);
  await fs.promises.mkdir(profileDir, { recursive: true });
  const chromePath = findChromeExecutable();
  if (!chromePath) {
    await shell.openExternal(url);
    return { ok: true, browser: "default", isolated: false, url, profileDir: null };
  }

  const args = [
    `--user-data-dir=${profileDir}`,
    `--remote-debugging-port=${debugPort}`,
    "--remote-allow-origins=*",
    "--profile-directory=Default",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-mode",
    "--new-window",
    url
  ];

  if (process.platform === "win32") {
    try {
      const command = [
        `$chrome = ${psSingleQuoted(chromePath)}`,
        `$chromeArgs = @(${args.map(psSingleQuoted).join(", ")})`,
        "Start-Process -FilePath $chrome -ArgumentList $chromeArgs -WindowStyle Normal"
      ].join("\n");
      await new Promise((resolve, reject) => {
        const psArgs = [
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-EncodedCommand",
          encodedPowerShell(command)
        ];
        execFile("powershell.exe", psArgs, { windowsHide: true }, (error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
      const debugState = await waitForChromeDebugPort(profile);
      if (!debugState.cdpReachable) {
        return {
          ok: false,
          reason: "CHROME_NOT_CONNECTED",
          message: `Chrome 已尝试启动，但 ${debugPort} 调试端口未连接。请确认没有被旧 Chrome 进程占用。`,
          browser: "chrome",
          isolated: true,
          url,
          profileDir,
          debugPort
        };
      }
      const result = { ok: true, browser: "chrome", isolated: true, url, profileDir, debugPort, ...debugState };
      launchedChromeProfiles.set(profile.id, result);
      return result;
    } catch {
      // Fall back to direct spawn below.
    }
  }

  await new Promise((resolve, reject) => {
    const child = spawn(chromePath, args, {
      detached: true,
      stdio: "ignore",
      windowsHide: false
    });
    let settled = false;
    const finish = (fn, value) => {
      if (settled) {
        return;
      }
      settled = true;
      fn(value);
    };
    child.once("error", (error) => finish(reject, error));
    child.once("spawn", () => {
      child.unref();
      setTimeout(() => finish(resolve), 250);
    });
    child.once("exit", (code) => {
      if (code && code !== 0) {
        finish(reject, new Error(`Chrome exited early with code ${code}`));
      } else {
        finish(resolve);
      }
    });
  });
  const debugState = await waitForChromeDebugPort(profile);
  if (!debugState.cdpReachable) {
    return {
      ok: false,
      reason: "CHROME_NOT_CONNECTED",
      message: `Chrome 已尝试启动，但 ${debugPort} 调试端口未连接。`,
      browser: "chrome",
      isolated: true,
      url,
      profileDir,
      debugPort
    };
  }
  const result = { ok: true, browser: "chrome", isolated: true, url, profileDir, debugPort, ...debugState };
  launchedChromeProfiles.set(profile.id, result);
  return result;
}

async function clearSystemChromeProfile(profile) {
  const profileDir = chromeProfileDir(profile);
  await fs.promises.rm(profileDir, { recursive: true, force: true, maxRetries: 2, retryDelay: 200 });
  return { ok: true, profileDir };
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function chromeDebugTargets(profile) {
  const debugPort = profileDebugPort(profile);
  const targets = await fetchJson(`http://127.0.0.1:${debugPort}/json/list`);
  return targets
    .filter((target) => target.type === "page")
    .map((target) => ({
      id: target.id,
      title: target.title,
      url: target.url,
      webSocketDebuggerUrl: target.webSocketDebuggerUrl
    }));
}

async function waitForChromeDebugPort(profile, timeoutMs = 6000) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const targets = await chromeDebugTargets(profile);
      return { cdpReachable: true, targets };
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  return {
    cdpReachable: false,
    targets: [],
    message: lastError?.message || "Chrome debug port not reachable"
  };
}

async function chromeIdentityStatus(profile) {
  const profileDir = chromeProfileDir(profile);
  const debugPort = profileDebugPort(profile);
  const chromePath = findChromeExecutable();
  let targets = [];
  let cdpReachable = false;
  try {
    targets = await chromeDebugTargets(profile);
    cdpReachable = true;
  } catch {
    targets = [];
  }
  return {
    ok: true,
    chromePath,
    profileDir,
    debugPort,
    cdpReachable,
    targets,
    launched: launchedChromeProfiles.get(profile.id) || null
  };
}

function loadProfileHome(view, profile) {
  return view.webContents.loadURL(profile.homeUrl || defaultBrowserHomeUrl);
}

function chromeLikeUserAgent() {
  const chromeVersion = process.versions.chrome || "126.0.0.0";
  return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
}

function sendBackendState(profileId) {
  if (!mainWindow || !profileId || profileId !== activeProfileId) {
    return;
  }
  const view = backendViews.get(profileId);
  if (!view) {
    return;
  }
  mainWindow.webContents.send("backend:state", {
    storeId: profileId,
    url: view.webContents.getURL(),
    title: view.webContents.getTitle(),
    canGoBack: view.webContents.canGoBack(),
    canGoForward: view.webContents.canGoForward(),
    isLoading: view.webContents.isLoading()
  });
}

function attachBackendEvents(profile, view) {
  const publish = () => sendBackendState(profile.id);
  view.webContents.setWindowOpenHandler(({ url }) => {
    if (canLoadRemoteUrl(url)) {
      view.webContents.loadURL(url);
    } else {
      shell.openExternal(url).catch(() => {});
    }
    return { action: "deny" };
  });
  view.webContents.on("did-start-loading", publish);
  view.webContents.on("did-stop-loading", publish);
  view.webContents.on("did-navigate", publish);
  view.webContents.on("did-navigate-in-page", publish);
  view.webContents.on("page-title-updated", publish);
  view.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    mainWindow?.webContents.send("backend:state", {
      storeId: profile.id,
      url: validatedURL,
      title: view.webContents.getTitle(),
      canGoBack: view.webContents.canGoBack(),
      canGoForward: view.webContents.canGoForward(),
      isLoading: false,
      error: `${errorCode}: ${errorDescription}`
    });
  });
}

function createBackendView(profile) {
  const partitionSession = session.fromPartition(profile.partition);
  const view = new BrowserView({
    webPreferences: {
      session: partitionSession,
      contextIsolation: true,
      nodeIntegration: false,
      partition: profile.partition
    }
  });

  view.webContents.setUserAgent(chromeLikeUserAgent());
  attachBackendEvents(profile, view);
  loadProfileHome(view, profile);
  return view;
}

function sanitizeBounds(bounds) {
  if (!mainWindow || !bounds) {
    return null;
  }
  const contentBounds = mainWindow.getContentBounds();
  const x = Math.max(0, Math.round(Number(bounds.x) || 0));
  const y = Math.max(0, Math.round(Number(bounds.y) || 0));
  const maxWidth = Math.max(240, contentBounds.width - x);
  const maxHeight = Math.max(180, contentBounds.height - y);
  return {
    x,
    y,
    width: Math.min(Math.max(240, Math.round(Number(bounds.width) || 0)), maxWidth),
    height: Math.min(Math.max(180, Math.round(Number(bounds.height) || 0)), maxHeight)
  };
}

function fallbackBackendBounds() {
  if (!mainWindow) {
    return { x: 366, y: 174, width: 900, height: 560 };
  }
  const bounds = mainWindow.getContentBounds();
  return {
    x: 366,
    y: 230,
    width: Math.max(620, bounds.width - 390),
    height: Math.max(360, bounds.height - 254)
  };
}

function layoutActiveBackendView() {
  if (!mainWindow || !activeProfileId) {
    return;
  }
  const view = backendViews.get(activeProfileId);
  if (!view) {
    return;
  }
  view.setBounds(browserBounds || fallbackBackendBounds());
  view.setAutoResize({
    width: false,
    height: false,
    horizontal: false,
    vertical: false
  });
}

function showBackend(profileInput) {
  if (!mainWindow) {
    return false;
  }
  const profile = getProfile(profileInput);
  if (!profile) {
    return false;
  }
  if (!backendViews.has(profile.id)) {
    backendViews.set(profile.id, createBackendView(profile));
  }
  const view = backendViews.get(profile.id);
  for (const attachedView of mainWindow.getBrowserViews()) {
    if (attachedView !== view) {
      mainWindow.removeBrowserView(attachedView);
    }
  }
  activeProfileId = profile.id;
  if (!mainWindow.getBrowserViews().includes(view)) {
    mainWindow.addBrowserView(view);
  }
  layoutActiveBackendView();
  sendBackendState(profile.id);
  return true;
}

ipcMain.handle("backend:open", (_event, profile) => {
  const ok = showBackend(profile);
  return { ok, storeId: normalizeProfile(profile)?.id };
});

ipcMain.handle("backend:open-all", (_event, profiles = []) => {
  const normalizedProfiles = profiles.map(registerProfile).filter(Boolean);
  normalizedProfiles.forEach((profile) => {
    if (!backendViews.has(profile.id)) {
      backendViews.set(profile.id, createBackendView(profile));
    }
  });
  if (normalizedProfiles[0]) {
    showBackend(normalizedProfiles[0]);
  }
  return { ok: true, storeIds: normalizedProfiles.map((profile) => profile.id) };
});

ipcMain.handle("backend:set-bounds", (_event, bounds) => {
  browserBounds = sanitizeBounds(bounds);
  layoutActiveBackendView();
  return { ok: true };
});

ipcMain.handle("backend:navigate", async (_event, action) => {
  if (!activeProfileId || !backendViews.has(activeProfileId)) {
    return { ok: false, reason: "NO_ACTIVE_BACKEND" };
  }
  const profile = getProfile(activeProfileId);
  const view = backendViews.get(activeProfileId);
  if (action === "back" && view.webContents.canGoBack()) {
    view.webContents.goBack();
  }
  if (action === "forward" && view.webContents.canGoForward()) {
    view.webContents.goForward();
  }
  if (action === "reload") {
    view.webContents.reload();
  }
  if (action === "home" && profile) {
    await loadProfileHome(view, profile);
  }
  if (action === "external") {
    const currentUrl = view.webContents.getURL();
    if (canLoadRemoteUrl(currentUrl)) {
      await shell.openExternal(currentUrl);
    }
  }
  sendBackendState(activeProfileId);
  return { ok: true, action };
});

ipcMain.handle("backend:go-to-url", async (_event, profileInput, input) => {
  const profile = getProfile(profileInput);
  if (!profile) {
    return { ok: false, reason: "UNKNOWN_PROFILE" };
  }
  const url = normalizeBrowserUrl(input);
  if (!url) {
    return { ok: false, reason: "UNSUPPORTED_URL" };
  }
  showBackend(profile);
  const view = backendViews.get(profile.id);
  await view.webContents.loadURL(url);
  sendBackendState(profile.id);
  return { ok: true, storeId: profile.id, url };
});

ipcMain.handle("backend:open-system-browser", async (_event, profileInput, input) => {
  const profile = getProfile(profileInput);
  if (!profile) {
    return { ok: false, reason: "UNKNOWN_PROFILE" };
  }
  try {
    return await openSystemChrome(profile, input);
  } catch (error) {
    return { ok: false, reason: "CHROME_LAUNCH_FAILED", message: error.message };
  }
});

ipcMain.handle("backend:clear-system-browser-profile", async (_event, profileInput) => {
  const profile = getProfile(profileInput);
  if (!profile) {
    return { ok: false, reason: "UNKNOWN_PROFILE" };
  }
  try {
    return await clearSystemChromeProfile(profile);
  } catch (error) {
    return { ok: false, reason: "CLEAR_FAILED", message: error.message };
  }
});

ipcMain.handle("backend:chrome-status", async (_event, profileInput) => {
  const profile = getProfile(profileInput);
  if (!profile) {
    return { ok: false, reason: "UNKNOWN_PROFILE" };
  }
  try {
    return await chromeIdentityStatus(profile);
  } catch (error) {
    return { ok: false, reason: "STATUS_FAILED", message: error.message };
  }
});

ipcMain.handle("backend:clear-session", async (_event, profileInput) => {
  const profile = getProfile(profileInput);
  if (!profile) {
    return { ok: false, reason: "UNKNOWN_PROFILE" };
  }
  const partitionSession = session.fromPartition(profile.partition);
  await partitionSession.clearStorageData();
  await partitionSession.clearCache();
  if (backendViews.has(profile.id)) {
    await loadProfileHome(backendViews.get(profile.id), profile);
  }
  return { ok: true, storeId: profile.id };
});

ipcMain.handle("backend:delete-profile", async (_event, profileId) => {
  const id = String(profileId || "");
  const profile = profileRegistry.get(id);
  const view = backendViews.get(id);
  if (view && mainWindow?.getBrowserViews().includes(view)) {
    mainWindow.removeBrowserView(view);
  }
  backendViews.delete(id);
  profileRegistry.delete(id);
  if (activeProfileId === id) {
    activeProfileId = null;
  }
  if (profile) {
    const partitionSession = session.fromPartition(profile.partition);
    await partitionSession.clearStorageData().catch(() => {});
    await partitionSession.clearCache().catch(() => {});
    try {
      await clearSystemChromeProfile(profile);
    } catch (error) {
      return { ok: false, reason: "CLEAR_FAILED", message: error.message, storeId: id };
    }
  }
  return { ok: true, storeId: id };
});

ipcMain.handle("backend:hide", () => {
  if (activeProfileId && backendViews.has(activeProfileId)) {
    mainWindow.removeBrowserView(backendViews.get(activeProfileId));
  }
  activeProfileId = null;
  return { ok: true };
});

app.whenReady().then(createMainWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
