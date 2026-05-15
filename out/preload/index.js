"use strict";
const electron = require("electron");
const preload = require("@electron-toolkit/preload");
const api = {
  selectFolder: () => electron.ipcRenderer.invoke("select-folder"),
  getPlatforms: () => electron.ipcRenderer.invoke("get-platforms"),
  scanRoms: (romsRoot) => electron.ipcRenderer.invoke("scan-roms", romsRoot),
  getGrids: (gameFilename, artType, sgdbKey) => electron.ipcRenderer.invoke("get-grids", gameFilename, artType, sgdbKey),
  downloadGrid: (romsRoot, folderName, subDir, gameFilename, gridUrl, artType) => electron.ipcRenderer.invoke("download-grid", romsRoot, folderName, subDir, gameFilename, gridUrl, artType),
  uploadArt: (romsRoot, folderName, subDir, gameFilename, artType) => electron.ipcRenderer.invoke("upload-art", romsRoot, folderName, subDir, gameFilename, artType),
  startSync: (config) => electron.ipcRenderer.invoke("start-sync", config),
  cancelSync: () => {
    electron.ipcRenderer.send("cancel-sync");
  },
  openExternal: (url) => {
    electron.ipcRenderer.invoke("open-external", url);
  },
  onSyncProgress: (callback) => {
    const handler = (_event, progress) => callback(progress);
    electron.ipcRenderer.on("sync-progress", handler);
    return () => electron.ipcRenderer.removeListener("sync-progress", handler);
  }
};
if (process.contextIsolated) {
  try {
    electron.contextBridge.exposeInMainWorld("electron", preload.electronAPI);
    electron.contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = preload.electronAPI;
  window.api = api;
}
