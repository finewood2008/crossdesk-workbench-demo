const path = require("path");
const { app, BrowserWindow } = require("electron");

async function runSmoke() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      partition: `smoke-${Date.now()}`
    }
  });

  await win.loadFile(path.join(__dirname, "..", "index.html"));

  const result = await win.webContents.executeJavaScript(`
    (async () => {
      const wait = () => new Promise((resolve) => requestAnimationFrame(resolve));
      const initialProfiles = document.querySelectorAll("[data-profile-id]").length;
      const inboxText = document.getElementById("threadList")?.textContent || "";
      const hasDemoInbox = inboxText.includes("会话队列") && inboxText.includes("Emily Carter");

      document.querySelector("[data-modal='browserProfileModal']").click();
      await wait();
      document.getElementById("profileName").value = "Smoke Google Account";
      document.getElementById("saveProfile").click();
      await wait();
      await wait();

      document.querySelector("[data-view='browser']").click();
      await wait();
      const profileTabs = document.querySelectorAll("[data-profile-id]").length;
      const toolbarButtons = [...document.querySelectorAll("#browserChrome button")]
        .map((button) => button.textContent.trim());

      document.querySelector("[data-view='knowledge']").click();
      await wait();
      document.querySelector("[data-modal='importModal']").click();
      await wait();
      document.getElementById("importSource").value = "Smoke real policy";
      document.getElementById("importText").value = "This is real user-provided policy text for smoke validation.";
      document.getElementById("startImport").click();
      await wait();
      await wait();
      const importedKnowledge = [...document.querySelectorAll("#knowledgeList strong")]
        .some((item) => item.textContent === "Smoke real policy");

      document.querySelector("[data-view='settings']").click();
      await wait();
      const privacyText = document.getElementById("connectionList")?.textContent || "";
      document.querySelector("[data-modal='privacyModal']").click();
      await wait();
      const privacyModalText = document.getElementById("privacyModal")?.textContent || "";

      const oldSensitiveInputs = [
        "profileMarket",
        "profileLoginUrl",
        "profileHomeUrl",
        "profilePlatform",
        "connectionPlatform",
        "connectionEndpoint",
        "connectionToken",
        "saveConnection"
      ].filter((id) => document.getElementById(id));

      return {
        initialProfiles,
        inboxHasDemoData: hasDemoInbox && !inboxText.includes("Olivia"),
        profileTabs,
        activeProfile: document.querySelector(".store-tab.active strong")?.textContent,
        importedKnowledge,
        hasPrivacyBoundary: privacyText.includes("不收集敏感登录信息") && privacyModalText.includes("不会要求填写 Google 密码"),
        oldSensitiveInputs,
        hasGoogleButton: toolbarButtons.includes("打开 Chrome"),
        hasLoginButton: toolbarButtons.includes("Chrome 登录"),
        hasClearSessionButton: toolbarButtons.includes("清除登录态"),
        hasDeleteButton: toolbarButtons.includes("删除身份"),
        addressText: document.getElementById("browserAddress")?.value?.trim() || ""
      };
    })();
  `);

  if (result.initialProfiles !== 0 || !result.inboxHasDemoData) {
    throw new Error(`Demo inbox data missing or legacy mock data visible: ${JSON.stringify(result)}`);
  }
  if (result.profileTabs !== 1 || result.activeProfile !== "Smoke Google Account") {
    throw new Error(`Profile creation failed: ${JSON.stringify(result)}`);
  }
  if (!result.importedKnowledge || !result.hasPrivacyBoundary) {
    throw new Error(`Real data and privacy boundary flow failed: ${JSON.stringify(result)}`);
  }
  if (result.oldSensitiveInputs.length) {
    throw new Error(`Sensitive input fields still exist: ${JSON.stringify(result)}`);
  }
  if (!result.hasGoogleButton || !result.hasLoginButton || !result.hasClearSessionButton || !result.hasDeleteButton) {
    throw new Error(`Browser controls missing: ${JSON.stringify(result)}`);
  }

  console.log("Smoke check passed:", JSON.stringify(result));
  await win.close();
}

app.whenReady()
  .then(runSmoke)
  .then(() => app.quit())
  .catch((error) => {
    console.error(error);
    app.exit(1);
  });
