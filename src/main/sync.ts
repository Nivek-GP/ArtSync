import * as fs from 'fs'
import * as path from 'path'
import Jimp from 'jimp'

export interface Platform {
  match: string
  tag: string
}

export const ALL_PLATFORMS: Platform[] = [
  { match: 'PlayStation (PS)', tag: 'PS' },
  { match: 'Game Boy Advance (GBA)', tag: 'GBA' },
  { match: 'Super Nintendo', tag: 'SFC' },
  { match: 'Game Boy Color', tag: 'GBC' },
  { match: 'Game Boy', tag: 'GB' },
  { match: 'Nintendo (FC)', tag: 'FC' },
  { match: 'Sega Genesis', tag: 'MD' },
  { match: 'Sega Master System', tag: 'SMS' },
  { match: 'Game Gear', tag: 'GG' },
  { match: 'PC Engine', tag: 'PCE' },
  { match: 'Neo Geo Pocket', tag: 'NGP' }
]

const ROM_EXTS = new Set([
  '.bin', '.cue', '.iso', '.pbp', '.chd', '.img', '.cso',
  '.smc', '.sfc', '.gb', '.gbc', '.gba', '.nes', '.fds',
  '.md', '.sms', '.gg', '.pce', '.ngp', '.ngc', '.m3u'
])

export interface GameEntry {
  filename: string
  hasArt: boolean
  subDir: string
}

export interface DetectedPlatform {
  tag: string
  folderName: string
  games: GameEntry[]
}

export interface GridItem {
  id: number
  url: string
  thumb: string
  isBestMatch: boolean
}

export interface SyncConfig {
  romsRoot: string
  sgdbKey: string
  artType: 'vertical' | 'horizontal'
  platformTags: string[]
}

export interface SyncProgress {
  current: number
  total: number
  downloaded: number
  skipped: number
  noMatch: number
  platformTag: string
  filename: string
}

function getResPath(romsRoot: string, folderName: string, subDir: string, filename: string): string {
  if (subDir) {
    // For games in a subfolder, MinUI shows the folder as the game entry — art uses the folder name
    const topDir = subDir.split(path.sep)[0]
    return path.join(romsRoot, folderName, '.res', topDir + '.png')
  }
  return path.join(romsRoot, folderName, '.res', filename + '.png')
}

function getBaseName(name: string): string {
  return name
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*\[[^\]]*\]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
}

function findFilesRecursive(dir: string, filter: (name: string) => boolean): string[] {
  const results: string[] = []
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) results.push(...findFilesRecursive(full, filter))
      else if (e.isFile() && filter(e.name)) results.push(full)
    }
  } catch {}
  return results
}

function scanGames(romDir: string, romsRoot: string, folderName: string): GameEntry[] {
  const games: GameEntry[] = []
  const coveredDirs = new Set<string>()

  for (const f of findFilesRecursive(romDir, (n) => n.toLowerCase().endsWith('.m3u'))) {
    const filename = path.basename(f)
    const subDir = path.relative(romDir, path.dirname(f))
    games.push({ filename, hasArt: fs.existsSync(getResPath(romsRoot, folderName, subDir, filename)), subDir })
    coveredDirs.add(path.dirname(f))
  }

  for (const f of findFilesRecursive(romDir, (n) => n.toLowerCase().endsWith('.cue'))) {
    const dir = path.dirname(f)
    if (dir !== romDir && !coveredDirs.has(dir)) {
      const filename = path.basename(f)
      const subDir = path.relative(romDir, dir)
      games.push({ filename, hasArt: fs.existsSync(getResPath(romsRoot, folderName, subDir, filename)), subDir })
      coveredDirs.add(dir)
    }
  }

  for (const f of findFilesRecursive(romDir, (n) => ROM_EXTS.has(path.extname(n).toLowerCase()))) {
    const dir = path.dirname(f)
    const filename = path.basename(f)
    if (coveredDirs.has(dir)) continue
    if (/\(Track\s*\d+\)/i.test(filename)) continue
    const subDir = path.relative(romDir, dir)
    games.push({ filename, hasArt: fs.existsSync(getResPath(romsRoot, folderName, subDir, filename)), subDir })
  }

  return games
}

export function scanRoms(romsRoot: string): DetectedPlatform[] {
  const result: DetectedPlatform[] = []
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(romsRoot, { withFileTypes: true })
  } catch {
    return result
  }

  for (const platform of ALL_PLATFORMS) {
    const found = entries.find(
      (e) => e.isDirectory() && e.name.toLowerCase().includes(platform.match.toLowerCase())
    )
    if (!found) continue
    const romDir = path.join(romsRoot, found.name)
    const games = scanGames(romDir, romsRoot, found.name)
    if (games.length === 0) continue
    result.push({ tag: platform.tag, folderName: found.name, games })
  }

  return result
}

async function fetchJson(url: string, sgdbKey: string): Promise<unknown> {
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${sgdbKey}`, 'User-Agent': 'ArtSync-MinUI' }
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json()
}

async function downloadBuffer(url: string): Promise<Buffer> {
  const resp = await fetch(url, { headers: { 'User-Agent': 'ArtSync-MinUI' } })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return Buffer.from(await resp.arrayBuffer())
}

async function resizeAndSave(
  imageBuffer: Buffer,
  destPath: string,
  artType: 'vertical' | 'horizontal'
): Promise<void> {
  const targetWidth = artType === 'vertical' ? 200 : 250
  const image = await Jimp.read(imageBuffer)
  image.resize(targetWidth, Jimp.AUTO)
  const dir = path.dirname(destPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  await image.writeAsync(destPath)
}

export async function getGrids(
  gameFilename: string,
  artType: 'vertical' | 'horizontal',
  sgdbKey: string
): Promise<GridItem[]> {
  const nameNoExt = path.basename(gameFilename, path.extname(gameFilename))
  const searchTerm = encodeURIComponent(getBaseName(nameNoExt) || nameNoExt)

  const searchData = (await fetchJson(
    `https://www.steamgriddb.com/api/v2/search/autocomplete/${searchTerm}`,
    sgdbKey
  )) as { data: Array<{ id: number }> }

  if (!searchData.data?.length) return []

  const gameId = searchData.data[0].id
  const dimensions = artType === 'vertical' ? '600x900' : '920x430'
  const gridsData = (await fetchJson(
    `https://www.steamgriddb.com/api/v2/grids/game/${gameId}?dimensions=${dimensions}&limit=10`,
    sgdbKey
  )) as { data: Array<{ id: number; url: string; thumb: string }> }

  if (!gridsData.data?.length) return []

  return gridsData.data.map((g, i) => ({
    id: g.id,
    url: g.url,
    thumb: g.thumb,
    isBestMatch: i === 0
  }))
}

export async function downloadGrid(
  romsRoot: string,
  folderName: string,
  subDir: string,
  gameFilename: string,
  gridUrl: string,
  artType: 'vertical' | 'horizontal'
): Promise<void> {
  const destPath = getResPath(romsRoot, folderName, subDir, gameFilename)
  const buffer = await downloadBuffer(gridUrl)
  await resizeAndSave(buffer, destPath, artType)
}

export async function uploadArt(
  romsRoot: string,
  folderName: string,
  subDir: string,
  gameFilename: string,
  artType: 'vertical' | 'horizontal',
  filePath: string
): Promise<void> {
  const buffer = fs.readFileSync(filePath)
  const destPath = getResPath(romsRoot, folderName, subDir, gameFilename)
  await resizeAndSave(buffer, destPath, artType)
}

let cancelFlag = false

export function cancelSync(): void {
  cancelFlag = true
}

export async function runSync(
  config: SyncConfig,
  onProgress: (p: SyncProgress) => void
): Promise<void> {
  cancelFlag = false

  const platforms = scanRoms(config.romsRoot).filter((p) =>
    config.platformTags.includes(p.tag)
  )

  const allGames = platforms.flatMap((p) =>
    p.games.filter((g) => !g.hasArt).map((g) => ({ platform: p, game: g }))
  )

  const total = allGames.length
  let current = 0
  let downloaded = 0
  let skipped = 0
  let noMatch = 0

  for (const { platform, game } of allGames) {
    if (cancelFlag) break
    current++

    onProgress({ current, total, downloaded, skipped, noMatch, platformTag: platform.tag, filename: game.filename })

    try {
      const grids = await getGrids(game.filename, config.artType, config.sgdbKey)
      if (!grids.length) {
        noMatch++
        continue
      }
      await downloadGrid(config.romsRoot, platform.folderName, game.subDir, game.filename, grids[0].url, config.artType)
      downloaded++
    } catch {
      noMatch++
    }

    onProgress({ current, total, downloaded, skipped, noMatch, platformTag: platform.tag, filename: game.filename })
  }
}
