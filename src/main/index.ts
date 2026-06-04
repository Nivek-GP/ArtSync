import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import * as path from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  scanRoms,
  getGrids,
  downloadGrid,
  uploadArt,
  runSync,
  cancelSync,
  getResPath,
  ALL_PLATFORMS,
  findOrphanedArt,
  deleteFiles
} from './sync'

let logPath: string

function log(msg: string): void {
  try {
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`)
  } catch {}
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 560,
    show: false,
    autoHideMenuBar: true,
    title: 'ArtSync for MinUI',
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.nivek-gp.artsync')

  const logsDir = app.getPath('logs')
  fs.mkdirSync(logsDir, { recursive: true })
  logPath = path.join(logsDir, 'artsync.log')
  log(`App started — version ${app.getVersion()}`)

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('get-platforms', () => ALL_PLATFORMS)

  ipcMain.handle('scan-roms', (_event, romsRoot: string) => {
    return scanRoms(romsRoot)
  })

  ipcMain.handle('get-grids', async (_event, gameFilename: string, artType: string, sgdbKey: string) => {
    return getGrids(gameFilename, artType as 'vertical' | 'horizontal', sgdbKey)
  })

  ipcMain.handle('read-art', (_event, romsRoot: string, folderName: string, subDir: string, gameFilename: string) => {
    const p = getResPath(romsRoot, folderName, subDir, gameFilename)
    if (!fs.existsSync(p)) return null
    return 'data:image/png;base64,' + fs.readFileSync(p).toString('base64')
  })

  ipcMain.handle('download-grid', async (_event, romsRoot: string, folderName: string, subDir: string, gameFilename: string, gridUrl: string, artType: string) => {
    await downloadGrid(romsRoot, folderName, subDir, gameFilename, gridUrl, artType as 'vertical' | 'horizontal')
  })

  ipcMain.handle('upload-art', async (event, romsRoot: string, folderName: string, subDir: string, gameFilename: string, artType: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
    })
    if (result.canceled || !result.filePaths[0]) return false
    await uploadArt(romsRoot, folderName, subDir, gameFilename, artType as 'vertical' | 'horizontal', result.filePaths[0])
    return true
  })

  ipcMain.handle('start-sync', async (event, config) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    await runSync(config, (progress) => {
      win?.webContents.send('sync-progress', progress)
    }, log)
  })

  ipcMain.handle('open-log-folder', () => shell.openPath(app.getPath('logs')))

  ipcMain.on('cancel-sync', () => cancelSync())

  ipcMain.handle('find-orphaned-art', (_event, romsRoot: string) => findOrphanedArt(romsRoot))

  ipcMain.handle('delete-orphaned-art', async (_event, files: string[]) => {
    await deleteFiles(files)
  })

  ipcMain.handle('open-external', (_event, url: string) => {
    shell.openExternal(url)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
