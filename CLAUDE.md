# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start in dev mode (hot-reload, Electron + Vite)
npm run build        # Typecheck + build for production
npm run build:win    # Build + package as Windows installer
npm run typecheck    # Run tsc on both main and renderer tsconfigs
npm run lint         # ESLint
npm run format       # Prettier
```

## Architecture

Electron app with three processes:

- **`src/main/`** — Node.js main process
  - `index.ts` — creates the window, registers all IPC handlers
  - `sync.ts` — all file system and SteamGridDB logic (scan ROMs, fetch grids, resize images, batch sync)

- **`src/preload/index.ts`** — context bridge that exposes `window.api` to the renderer

- **`src/renderer/src/App.tsx`** — single React component, entire UI

There are no shared type definitions between processes; interfaces are duplicated in `sync.ts` and `App.tsx`.

## Art path convention (critical)

MinUI reads boxart from a `.res/` folder relative to the **platform root**, named after what MinUI shows as the game entry:

- **Single-file game** (`Platform/Game.sfc`): art at `Platform/.res/Game.sfc.png`
- **Game in a subfolder** (`Platform/GameFolder/game.m3u`): art at `Platform/.res/GameFolder.png` — folder name only, **no ROM extension**

This is enforced in `sync.ts:getResPath`. The `subDir` field on `GameEntry` is the path relative to the platform folder's ROM directory; when non-empty it signals a subfolder game and only the top-level folder name is used for the art filename.

## SteamGridDB integration

`getGrids()` in `sync.ts` takes the ROM filename, strips regional tags with `getBaseName()`, calls the autocomplete endpoint to get a game ID, then fetches grids filtered by dimension (`600x900` vertical / `920x430` horizontal). Images are resized to 200 px wide (vertical) or 250 px wide (horizontal) via Jimp before saving.

## SD card layout (MinUI)

The target SD is mounted at the path the user selects as `romsRoot`. Expected structure:

```
<romsRoot>/
  <Platform (TAG)>/          # e.g. "Super Nintendo (SFC)"
    <Game.rom>               # single-file game
    <GameFolder>/            # multi-disc game
      game.m3u
    .res/
      Game.rom.png           # single-file art
      GameFolder.png         # multi-disc art
```

Supported platforms are defined in `ALL_PLATFORMS` in `sync.ts`.
