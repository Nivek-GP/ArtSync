import { ElectronAPI } from '@electron-toolkit/preload'

interface Platform {
  match: string
  tag: string
}

interface GameEntry {
  filename: string
  hasArt: boolean
}

interface DetectedPlatform {
  tag: string
  folderName: string
  games: GameEntry[]
}

interface GridItem {
  id: number
  url: string
  thumb: string
  isBestMatch: boolean
}

interface SyncConfig {
  romsRoot: string
  sgdbKey: string
  artType: 'vertical' | 'horizontal'
  platformTags: string[]
}

interface SyncProgress {
  current: number
  total: number
  downloaded: number
  skipped: number
  noMatch: number
  platformTag: string
  filename: string
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      selectFolder: () => Promise<string | null>
      getPlatforms: () => Promise<Platform[]>
      scanRoms: (romsRoot: string) => Promise<DetectedPlatform[]>
      getGrids: (gameFilename: string, artType: string, sgdbKey: string) => Promise<GridItem[]>
      downloadGrid: (romsRoot: string, folderName: string, gameFilename: string, gridUrl: string, artType: string) => Promise<void>
      uploadArt: (romsRoot: string, folderName: string, gameFilename: string, artType: string) => Promise<boolean>
      startSync: (config: SyncConfig) => Promise<void>
      cancelSync: () => void
      openExternal: (url: string) => void
      onSyncProgress: (callback: (progress: SyncProgress) => void) => () => void
    }
  }
}
