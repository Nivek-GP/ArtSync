import React, { useState, useEffect, useCallback } from 'react'
import './assets/main.css'

interface GameEntry {
  filename: string
  hasArt: boolean
  subDir: string
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
  isCurrentArt?: boolean
}

interface SelectedGame {
  platformTag: string
  folderName: string
  filename: string
  subDir: string
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

function LogoIcon(): React.JSX.Element {
  return (
    <svg width="36" height="36" viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <rect width="44" height="44" rx="10" fill="url(#logoGrad)" />
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7b6fff" />
          <stop offset="100%" stopColor="#4f3fff" />
        </linearGradient>
      </defs>
      <rect x="7" y="9" width="30" height="26" rx="3" fill="white" />
      <rect x="10" y="12" width="24" height="18" rx="2" fill="#4f3fff" />
      <polygon points="13,26 18.5,18 24,26" fill="white" opacity="0.6" />
      <polygon points="20,26 27,16 34,26" fill="white" />
      <circle cx="28.5" cy="15.5" r="2.5" fill="white" opacity="0.85" />
    </svg>
  )
}

function stripExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  return lastDot > 0 ? filename.slice(0, lastDot) : filename
}

export default function App(): React.JSX.Element {
  const [romsRoot, setRomsRoot] = useState(() => localStorage.getItem('romsRoot') ?? '')
  const [sgdbKey, setSgdbKey] = useState(() => localStorage.getItem('sgdbKey') ?? '')
  const [artType, setArtType] = useState<'vertical' | 'horizontal'>(
    () => (localStorage.getItem('artType') as 'vertical' | 'horizontal') ?? 'vertical'
  )
  const [platforms, setPlatforms] = useState<DetectedPlatform[]>([])
  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'all' | 'missing' | 'has-art'>('all')
  const [selectedGame, setSelectedGame] = useState<SelectedGame | null>(null)
  const [grids, setGrids] = useState<GridItem[]>([])
  const [selectedGridUrl, setSelectedGridUrl] = useState<string | null>(null)
  const [loadingGrids, setLoadingGrids] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [scanning, setScanning] = useState(false)

  useEffect(() => { localStorage.setItem('romsRoot', romsRoot) }, [romsRoot])
  useEffect(() => { localStorage.setItem('sgdbKey', sgdbKey) }, [sgdbKey])
  useEffect(() => { localStorage.setItem('artType', artType) }, [artType])

  const doScan = useCallback(async (root: string) => {
    if (!root) return
    setScanning(true)
    try {
      const result = await window.api.scanRoms(root)
      setPlatforms(result)
      setExpandedPlatforms(new Set(result.map((p) => p.tag)))
      setSelectedGame(null)
      setGrids([])
    } finally {
      setScanning(false)
    }
  }, [])

  useEffect(() => {
    if (romsRoot) doScan(romsRoot)
  }, [romsRoot, doScan])

  const selectRomsFolder = async (): Promise<void> => {
    const p = await window.api.selectFolder()
    if (p) setRomsRoot(p)
  }

  const togglePlatform = (tag: string): void => {
    setExpandedPlatforms((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  const selectGame = async (platform: DetectedPlatform, game: GameEntry): Promise<void> => {
    const next: SelectedGame = { platformTag: platform.tag, folderName: platform.folderName, filename: game.filename, subDir: game.subDir }
    setSelectedGame(next)
    setGrids([])
    setSelectedGridUrl(null)

    if (!sgdbKey) return
    setLoadingGrids(true)
    try {
      const [result, currentDataUrl] = await Promise.all([
        window.api.getGrids(game.filename, artType, sgdbKey),
        game.hasArt ? window.api.readArt(romsRoot, platform.folderName, game.subDir, game.filename) : Promise.resolve(null)
      ])
      if (currentDataUrl) {
        const currentItem: GridItem = { id: -1, url: currentDataUrl, thumb: currentDataUrl, isBestMatch: false, isCurrentArt: true }
        setGrids([currentItem, ...result])
        setSelectedGridUrl(currentDataUrl)
      } else {
        setGrids(result)
        if (result.length > 0) setSelectedGridUrl(result[0].url)
      }
    } finally {
      setLoadingGrids(false)
    }
  }

  const handleDownload = async (): Promise<void> => {
    if (!selectedGame || !selectedGridUrl || !romsRoot) return
    setDownloading(true)
    try {
      await window.api.downloadGrid(
        romsRoot,
        selectedGame.folderName,
        selectedGame.subDir,
        selectedGame.filename,
        selectedGridUrl,
        artType
      )
      setPlatforms((prev) =>
        prev.map((p) =>
          p.tag === selectedGame.platformTag
            ? { ...p, games: p.games.map((g) => g.filename === selectedGame.filename ? { ...g, hasArt: true } : g) }
            : p
        )
      )
      const newDataUrl = await window.api.readArt(romsRoot, selectedGame.folderName, selectedGame.subDir, selectedGame.filename)
      if (newDataUrl) {
        const currentItem: GridItem = { id: -1, url: newDataUrl, thumb: newDataUrl, isBestMatch: false, isCurrentArt: true }
        setGrids((prev) => [currentItem, ...prev.filter((g) => !g.isCurrentArt)])
        setSelectedGridUrl(newDataUrl)
      }
    } finally {
      setDownloading(false)
    }
  }

  const handleUpload = async (): Promise<void> => {
    if (!selectedGame || !romsRoot) return
    const success = await window.api.uploadArt(
      romsRoot,
      selectedGame.folderName,
      selectedGame.subDir,
      selectedGame.filename,
      artType
    )
    if (success) {
      setPlatforms((prev) =>
        prev.map((p) =>
          p.tag === selectedGame.platformTag
            ? { ...p, games: p.games.map((g) => g.filename === selectedGame.filename ? { ...g, hasArt: true } : g) }
            : p
        )
      )
    }
  }

  const handleSyncAll = async (): Promise<void> => {
    if (!romsRoot || !sgdbKey || syncing) return
    setSyncing(true)
    setSyncProgress(null)

    const unsub = window.api.onSyncProgress((progress) => {
      setSyncProgress(progress)
      if (progress.current > 0 && progress.downloaded > 0) {
        setPlatforms((prev) =>
          prev.map((p) =>
            p.tag === progress.platformTag
              ? { ...p, games: p.games.map((g) => g.filename === progress.filename ? { ...g, hasArt: true } : g) }
              : p
          )
        )
      }
    })

    await window.api.startSync({
      romsRoot,
      sgdbKey,
      artType,
      platformTags: platforms.map((p) => p.tag)
    })

    unsub()
    setSyncing(false)
    setSyncProgress(null)
  }

  const handleArtTypeChange = async (type: 'vertical' | 'horizontal'): Promise<void> => {
    setArtType(type)
    if (selectedGame && sgdbKey) {
      setLoadingGrids(true)
      setGrids([])
      setSelectedGridUrl(null)
      try {
        const result = await window.api.getGrids(selectedGame.filename, type, sgdbKey)
        setGrids(result)
        if (result.length > 0) setSelectedGridUrl(result[0].url)
      } finally {
        setLoadingGrids(false)
      }
    }
  }

  const totalHasArt = platforms.reduce((n, p) => n + p.games.filter((g) => g.hasArt).length, 0)
  const totalMissing = platforms.reduce((n, p) => n + p.games.filter((g) => !g.hasArt).length, 0)
  const totalMissingForSync = totalMissing
  const syncPercent = syncProgress && syncProgress.total > 0
    ? Math.round((syncProgress.current / syncProgress.total) * 100)
    : 0

  const canSync = Boolean(romsRoot && sgdbKey && !syncing && !scanning && totalMissingForSync > 0)

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-logo">
          <LogoIcon />
          <div>
            <h1>ArtSync</h1>
            <span className="logo-sub">for MinUI</span>
          </div>
        </div>
        <div className="header-divider" />
        <div className="header-controls">
          <button className="folder-btn" onClick={selectRomsFolder} title="Select ROM folder">
            <span className="folder-label">ROMs</span>
            {romsRoot
              ? <span className="folder-path">{romsRoot}</span>
              : <span className="folder-placeholder">Select folder…</span>
            }
          </button>

          <input
            className="api-key-input"
            type="password"
            value={sgdbKey}
            onChange={(e) => setSgdbKey(e.target.value)}
            placeholder="SteamGridDB API key"
            title="SteamGridDB API key"
          />

          <div className="art-type-toggle">
            <button
              className={`art-type-btn ${artType === 'vertical' ? 'active' : ''}`}
              onClick={() => handleArtTypeChange('vertical')}
            >
              Vertical
            </button>
            <button
              className={`art-type-btn ${artType === 'horizontal' ? 'active' : ''}`}
              onClick={() => handleArtTypeChange('horizontal')}
            >
              Horizontal
            </button>
          </div>

          <div className="header-spacer" />

          {syncing ? (
            <button className="btn-sync-all" style={{ background: 'rgba(224,90,106,0.15)', color: 'var(--missing)', border: '1px solid rgba(224,90,106,0.3)' }} onClick={() => window.api.cancelSync()}>
              Cancel sync
            </button>
          ) : (
            <button className="btn-sync-all" onClick={handleSyncAll} disabled={!canSync}>
              Sync All ({totalMissingForSync})
            </button>
          )}
        </div>
      </header>

      <div className="app-body">
        {/* Left: game list */}
        <aside className="game-list-panel">
          <div className="panel-toolbar">
            <span className="panel-toolbar-label">Games</span>
            <select
              className="filter-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
            >
              <option value="all">All</option>
              <option value="missing">Missing art</option>
              <option value="has-art">Has art</option>
            </select>
          </div>

          <div className="game-list-scroll">
            {scanning && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                Scanning…
              </div>
            )}
            {!scanning && platforms.length === 0 && romsRoot && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                No ROMs found
              </div>
            )}
            {!scanning && !romsRoot && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                Select a ROM folder to start
              </div>
            )}
            {platforms.map((platform) => {
              const filtered = platform.games.filter((g) =>
                filter === 'all' ? true : filter === 'missing' ? !g.hasArt : g.hasArt
              )
              if (filtered.length === 0) return null
              const expanded = expandedPlatforms.has(platform.tag)
              const hasArtCount = platform.games.filter((g) => g.hasArt).length

              return (
                <div key={platform.tag} className="platform-group">
                  <button className="platform-header-btn" onClick={() => togglePlatform(platform.tag)}>
                    <span className={`expand-chevron ${expanded ? 'open' : ''}`}>›</span>
                    <span className="platform-tag">{platform.tag}</span>
                    <span className="platform-art-count">{hasArtCount}/{platform.games.length}</span>
                  </button>

                  {expanded && (
                    <div className="game-items">
                      {filtered.map((game) => {
                        const isSelected =
                          selectedGame?.platformTag === platform.tag &&
                          selectedGame?.filename === game.filename
                        return (
                          <button
                            key={game.filename}
                            className={`game-item-btn ${isSelected ? 'selected' : ''}`}
                            onClick={() => selectGame(platform, game)}
                            title={game.filename}
                          >
                            <span className={`status-dot ${game.hasArt ? 'ok' : 'missing'}`} />
                            <span className="game-name">{stripExtension(game.filename)}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </aside>

        {/* Right: art browser */}
        <main className="art-panel">
          {!selectedGame ? (
            <div className="art-empty">
              <div className="art-empty-icon">🖼</div>
              <p>Select a game to browse artwork</p>
            </div>
          ) : (
            <>
              <div className="art-panel-header">
                <h2>{stripExtension(selectedGame.filename)}</h2>
                <span className="game-filename">{selectedGame.filename}</span>
              </div>

              {loadingGrids ? (
                <div className="art-loading">
                  <div className="spinner" />
                </div>
              ) : grids.length === 0 ? (
                <div className="art-no-results">
                  <div className="art-empty-icon" style={{ fontSize: '32px', opacity: 0.3 }}>🔍</div>
                  <p>No artwork found on SteamGridDB</p>
                  <button className="btn-upload" onClick={handleUpload}>
                    📁 Upload image manually
                  </button>
                </div>
              ) : (
                <>
                  <div className={`grid-thumbnails ${artType === 'horizontal' ? 'horizontal' : ''}`}>
                    {grids.map((grid) => (
                      <button
                        key={grid.id}
                        className={`thumbnail-card ${artType === 'horizontal' ? 'horizontal' : ''} ${selectedGridUrl === grid.url ? 'selected' : ''}`}
                        onClick={() => setSelectedGridUrl(grid.url)}
                        title={grid.isBestMatch ? 'Best match' : ''}
                      >
                        {grid.isCurrentArt && <span className="current-badge">✓ Actual</span>}
                        {grid.isBestMatch && <span className="best-badge">★ Best</span>}
                        <img src={grid.thumb} alt="" loading="lazy" />
                      </button>
                    ))}
                  </div>

                  <div className="art-actions">
                    <button
                      className="btn-download"
                      disabled={!selectedGridUrl || downloading}
                      onClick={handleDownload}
                    >
                      {downloading ? 'Downloading…' : '↓ Download selected'}
                    </button>
                    <button className="btn-upload" onClick={handleUpload}>
                      📁 Upload image
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>

      <footer className="app-footer">
        <div className="footer-stats">
          <span className="stat-ok">✓ {totalHasArt}</span>
          <span className="stat-missing">✗ {totalMissing}</span>
        </div>

        {syncing && syncProgress ? (
          <div className="sync-progress-wrap">
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${syncPercent}%` }} />
            </div>
            <span className="progress-text">
              {syncProgress.current}/{syncProgress.total}
              {' · '}✓{syncProgress.downloaded}
              {' · '}✗{syncProgress.noMatch}
            </span>
          </div>
        ) : (
          <div className="footer-spacer" />
        )}

        <button
          className="author-link"
          onClick={() => window.api.openExternal('https://github.com/Nivek-GP')}
        >
          by Nivek-GP
        </button>
      </footer>
    </div>
  )
}
