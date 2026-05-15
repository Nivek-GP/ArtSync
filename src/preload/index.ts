import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('select-folder'),
  getPlatforms: () => ipcRenderer.invoke('get-platforms'),
  scanRoms: (romsRoot: string) => ipcRenderer.invoke('scan-roms', romsRoot),
  getGrids: (gameFilename: string, artType: string, sgdbKey: string) =>
    ipcRenderer.invoke('get-grids', gameFilename, artType, sgdbKey),
  downloadGrid: (romsRoot: string, folderName: string, subDir: string, gameFilename: string, gridUrl: string, artType: string) =>
    ipcRenderer.invoke('download-grid', romsRoot, folderName, subDir, gameFilename, gridUrl, artType),
  uploadArt: (romsRoot: string, folderName: string, subDir: string, gameFilename: string, artType: string) =>
    ipcRenderer.invoke('upload-art', romsRoot, folderName, subDir, gameFilename, artType),
  startSync: (config: unknown): Promise<void> => ipcRenderer.invoke('start-sync', config),
  cancelSync: (): void => { ipcRenderer.send('cancel-sync') },
  openExternal: (url: string): void => { ipcRenderer.invoke('open-external', url) },
  onSyncProgress: (callback: (progress: unknown) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: unknown): void => callback(progress)
    ipcRenderer.on('sync-progress', handler)
    return () => ipcRenderer.removeListener('sync-progress', handler)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
