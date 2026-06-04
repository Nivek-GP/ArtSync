import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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
          <stop offset="0%" stopColor="#555555" />
          <stop offset="100%" stopColor="#252525" />
        </linearGradient>
      </defs>
      {/* screen lid: ∩ shape — top bar + left/right columns, open at hinge */}
      <path
        d="M 7,22 L 7,3 Q 7,2 9,2 L 35,2 Q 37,2 37,3 L 37,22"
        fill="none"
        stroke="white"
        strokeWidth="2.4"
        strokeOpacity="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* body: closed trapezoid — top edge is the hinge line */}
      <path
        d="M 7,22 L 3,40 Q 3,41 5,41 L 39,41 Q 41,41 41,40 L 37,22 Z"
        fill="none"
        stroke="white"
        strokeWidth="2.4"
        strokeOpacity="0.9"
        strokeLinejoin="round"
      />
      {/* d-pad */}
      <rect x="8" y="30.5" width="6.5" height="2.5" rx="1" fill="white" fillOpacity="0.85" />
      <rect x="10.25" y="28.5" width="2.5" height="6.5" rx="1" fill="white" fillOpacity="0.85" />
      {/* face buttons */}
      <circle cx="32" cy="30" r="2" fill="white" fillOpacity="0.85" />
      <circle cx="36.5" cy="30" r="2" fill="white" fillOpacity="0.85" />
      <circle cx="32" cy="34.5" r="2" fill="white" fillOpacity="0.85" />
      <circle cx="36.5" cy="34.5" r="2" fill="white" fillOpacity="0.85" />
      {/* download arrow */}
      <line x1="22" y1="1" x2="22" y2="15"
        stroke="white" strokeWidth="5" strokeLinecap="round" strokeOpacity="0.95" />
      <polygon points="12,14 32,14 22,27" fill="white" fillOpacity="0.95" />
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
  const [activePlatforms, setActivePlatforms] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'all' | 'missing' | 'has-art'>('all')
  const [selectedGame, setSelectedGame] = useState<SelectedGame | null>(null)
  const [grids, setGrids] = useState<GridItem[]>([])
  const [selectedGridUrl, setSelectedGridUrl] = useState<string | null>(null)
  const [loadingGrids, setLoadingGrids] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [orphanedFiles, setOrphanedFiles] = useState<string[] | null>(null)
  const [cleanScanning, setCleanScanning] = useState(false)
  const [cleaning, setCleaning] = useState(false)

  useEffect(() => { localStorage.setItem('romsRoot', romsRoot) }, [romsRoot])
  useEffect(() => { localStorage.setItem('sgdbKey', sgdbKey) }, [sgdbKey])
  useEffect(() => { localStorage.setItem('artType', artType) }, [artType])

  const doScan = useCallback(async (root: string) => {
    if (!root) return
    setScanning(true)
    setOrphanedFiles(null)
    try {
      const result = await window.api.scanRoms(root)
      setPlatforms(result)
      setExpandedPlatforms(new Set(result.map((p) => p.tag)))
      setActivePlatforms(new Set(result.map((p) => p.tag)))
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

  const togglePlatformFilter = (tag: string): void => {
    setActivePlatforms((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) {
        if (next.size === 1) return prev  // no dejar todo oculto
        next.delete(tag)
      } else {
        next.add(tag)
      }
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
    const snapshot = selectedGame
    setDownloading(true)
    try {
      await window.api.downloadGrid(
        romsRoot,
        snapshot.folderName,
        snapshot.subDir,
        snapshot.filename,
        selectedGridUrl,
        artType
      )
      setPlatforms((prev) =>
        prev.map((p) =>
          p.tag === snapshot.platformTag
            ? { ...p, games: p.games.map((g) => g.filename === snapshot.filename ? { ...g, hasArt: true } : g) }
            : p
        )
      )
      const newDataUrl = await window.api.readArt(romsRoot, snapshot.folderName, snapshot.subDir, snapshot.filename)
      const current = selectedGameRef.current
      if (newDataUrl && current?.platformTag === snapshot.platformTag && current?.filename === snapshot.filename) {
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
    const snapshot = selectedGame
    const success = await window.api.uploadArt(
      romsRoot,
      snapshot.folderName,
      snapshot.subDir,
      snapshot.filename,
      artType
    )
    if (success) {
      setPlatforms((prev) =>
        prev.map((p) =>
          p.tag === snapshot.platformTag
            ? { ...p, games: p.games.map((g) => g.filename === snapshot.filename ? { ...g, hasArt: true } : g) }
            : p
        )
      )
      const newDataUrl = await window.api.readArt(romsRoot, snapshot.folderName, snapshot.subDir, snapshot.filename)
      const current = selectedGameRef.current
      if (newDataUrl && current?.platformTag === snapshot.platformTag && current?.filename === snapshot.filename) {
        const currentItem: GridItem = { id: -1, url: newDataUrl, thumb: newDataUrl, isBestMatch: false, isCurrentArt: true }
        setGrids((prev) => [currentItem, ...prev.filter((g) => !g.isCurrentArt)])
        setSelectedGridUrl(newDataUrl)
      }
    }
  }

  const handleSyncAll = async (): Promise<void> => {
    if (!romsRoot || !sgdbKey || syncing) return
    setSyncing(true)
    setSyncProgress(null)

    const unsub = window.api.onSyncProgress((progress) => {
      setSyncProgress(progress)
      if (progress.justDownloaded) {
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
      platformTags: visiblePlatforms.map((p) => p.tag)
    })

    unsub()
    setSyncing(false)
    setSyncProgress(null)
    await doScan(romsRoot)
  }

  const handleFindOrphans = async (): Promise<void> => {
    if (!romsRoot) return
    setCleanScanning(true)
    setOrphanedFiles(null)
    const files = await window.api.findOrphanedArt(romsRoot)
    setOrphanedFiles(files)
    setCleanScanning(false)
  }

  const handleCleanOrphans = async (): Promise<void> => {
    if (!orphanedFiles || orphanedFiles.length === 0) return
    setCleaning(true)
    await window.api.deleteOrphanedArt(orphanedFiles)
    setOrphanedFiles(null)
    setCleaning(false)
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

  const visiblePlatforms = platforms.filter((p) => activePlatforms.has(p.tag))

  const listScrollRef = useRef<HTMLDivElement>(null)
  const selectedGameRef = useRef(selectedGame)
  selectedGameRef.current = selectedGame

  const navigableGames = useMemo(() => {
    const result: Array<{ platform: DetectedPlatform; game: GameEntry }> = []
    for (const platform of visiblePlatforms) {
      if (!expandedPlatforms.has(platform.tag)) continue
      const filtered = platform.games.filter((g) =>
        filter === 'all' ? true : filter === 'missing' ? !g.hasArt : g.hasArt
      )
      for (const game of filtered) result.push({ platform, game })
    }
    return result
  }, [visiblePlatforms, expandedPlatforms, filter])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (!selectedGame || loadingGrids) return
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
      const idx = navigableGames.findIndex(
        ({ platform, game }) =>
          platform.tag === selectedGame.platformTag && game.filename === selectedGame.filename
      )
      if (idx === -1) return
      e.preventDefault()
      const nextIdx = e.key === 'ArrowDown'
        ? Math.min(idx + 1, navigableGames.length - 1)
        : Math.max(idx - 1, 0)
      if (nextIdx !== idx) {
        const { platform, game } = navigableGames[nextIdx]
        selectGame(platform, game)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedGame, navigableGames, loadingGrids, selectGame])

  useEffect(() => {
    if (!selectedGame || !listScrollRef.current) return
    const key = `${selectedGame.platformTag}:${selectedGame.filename}`
    const el = listScrollRef.current.querySelector<HTMLElement>(`[data-game-key="${key}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedGame])

  const totalHasArt = platforms.reduce((n, p) => n + p.games.filter((g) => g.hasArt).length, 0)
  const totalMissing = platforms.reduce((n, p) => n + p.games.filter((g) => !g.hasArt).length, 0)
  const totalMissingForSync = filter === 'has-art'
    ? 0
    : visiblePlatforms.reduce((n, p) => n + p.games.filter((g) => !g.hasArt).length, 0)
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

          <button
            className="btn-sync-all"
            onClick={() => doScan(romsRoot)}
            disabled={!romsRoot || scanning || syncing}
            title="Re-scan SD card for ROM and art changes"
          >
            {scanning ? 'Scanning…' : 'Refresh'}
          </button>

          <button
            className="btn-sync-all"
            onClick={orphanedFiles && orphanedFiles.length > 0 ? handleCleanOrphans : handleFindOrphans}
            disabled={!romsRoot || syncing || cleanScanning || cleaning}
          >
            {cleaning
              ? 'Deleting…'
              : cleanScanning
                ? 'Scanning…'
                : orphanedFiles && orphanedFiles.length > 0
                  ? `Delete ${orphanedFiles.length} orphan${orphanedFiles.length !== 1 ? 's' : ''}`
                  : 'Clean Art'}
          </button>
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

          {platforms.length > 0 && (
            <div className="platform-filter">
              {platforms.map((p) => (
                <button
                  key={p.tag}
                  className={`platform-chip ${activePlatforms.has(p.tag) ? 'active' : ''}`}
                  onClick={() => togglePlatformFilter(p.tag)}
                >
                  {p.tag}
                </button>
              ))}
            </div>
          )}

          <div className="game-list-scroll" ref={listScrollRef}>
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
            {visiblePlatforms.map((platform) => {
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
                            data-game-key={`${platform.tag}:${game.filename}`}
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
        ) : orphanedFiles !== null && !cleaning ? (
          <span className="progress-text">
            {orphanedFiles.length === 0
              ? 'No orphaned art found'
              : `${orphanedFiles.length} orphaned image${orphanedFiles.length !== 1 ? 's' : ''} — click "Delete" to remove`}
          </span>
        ) : (
          <div className="footer-spacer" />
        )}

        <button
          className="author-link"
          onClick={() => window.api.openLogFolder()}
          title="Open log folder"
        >
          View Logs
        </button>

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
