# ArtSync for MinUI

Desktop app to automatically download and manage boxart for your [MinUI](https://github.com/shauninman/MinUI) ROM collection from [SteamGridDB](https://www.steamgriddb.com/).

![ArtSync screenshot](https://github.com/Nivek-GP/ArtSync/assets/placeholder/screenshot.png)

## Features

- **Auto-scan** — detects all supported platforms and ROMs on your SD card
- **SteamGridDB integration** — searches and downloads boxart automatically
- **Manual upload** — use your own images for any game
- **Batch sync** — download missing art for all games in one click
- **Platform filter chips** — focus on specific platforms
- **Keyboard navigation** — browse games with ↑↓ arrow keys
- **Current art preview** — shows your installed art pre-selected in the grid
- Supports both **vertical** (2:3) and **horizontal** (16:9-ish) art formats

## Supported Platforms

| Tag | Platform |
|-----|----------|
| PS | PlayStation |
| GBA | Game Boy Advance |
| SFC | Super Nintendo |
| GBC | Game Boy Color |
| GB | Game Boy |
| FC | Nintendo (Famicom) |
| MD | Sega Genesis / Mega Drive |
| SMS | Sega Master System |
| GG | Game Gear |
| PCE | PC Engine |
| NGP | Neo Geo Pocket |

## Requirements

- A **SteamGridDB API key** — free at [steamgriddb.com/profile/preferences/api](https://www.steamgriddb.com/profile/preferences/api)
- MinUI SD card mounted and accessible

## Installation

Download the latest installer from the [Releases](https://github.com/Nivek-GP/ArtSync/releases) page and run it.

## Usage

1. Click **ROMs** and select your SD card's root ROMs folder (e.g. `F:\Roms`)
2. Paste your **SteamGridDB API key**
3. Choose **Vertical** or **Horizontal** art format
4. Click a game to browse available artwork — your current art appears pre-selected
5. Click **↓ Download selected** to save, or **Sync All** to download everything missing at once

## Art Path Convention (MinUI)

MinUI reads boxart from `<Platform>/.res/` named after what it shows as the game entry:

- Single-file game (`SFC/Game.sfc`) → `SFC/.res/Game.sfc.png`
- Multi-disc game (`PS/GameFolder/game.m3u`) → `PS/.res/GameFolder.png`

ArtSync handles this automatically.

## Development

```bash
npm install
npm run dev          # hot-reload dev mode
npm run build:win    # build Windows installer
npm run generate-icons  # regenerate app icons from SVG
```

Requires Node.js 18+.

## License

MIT
