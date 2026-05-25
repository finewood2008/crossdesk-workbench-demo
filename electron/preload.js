const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("crossdesk", {
  isElectron: true,
  openBackend: (profile) => ipcRenderer.invoke("backend:open", profile),
  openAllBackends: (profiles) => ipcRenderer.invoke("backend:open-all", profiles),
  setBackendBounds: (bounds) => ipcRenderer.invoke("backend:set-bounds", bounds),
  navigateBackend: (action) => ipcRenderer.invoke("backend:navigate", action),
  goToUrl: (profile, url) => ipcRenderer.invoke("backend:go-to-url", profile, url),
  openSystemBrowser: (profile, url) => ipcRenderer.invoke("backend:open-system-browser", profile, url),
  chromeStatus: (profile) => ipcRenderer.invoke("backend:chrome-status", profile),
  clearSession: (profile) => ipcRenderer.invoke("backend:clear-session", profile),
  clearSystemBrowserProfile: (profile) => ipcRenderer.invoke("backend:clear-system-browser-profile", profile),
  deleteProfile: (profileId) => ipcRenderer.invoke("backend:delete-profile", profileId),
  hideBackend: () => ipcRenderer.invoke("backend:hide"),
  onBackendState: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("backend:state", listener);
    return () => ipcRenderer.removeListener("backend:state", listener);
  }
});
