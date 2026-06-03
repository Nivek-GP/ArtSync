<div align="center">
  <img src="https://raw.githubusercontent.com/Nivek-GP/ArtSync/master/resources/icon.png" width="100" alt="ArtSync">
  <h1>ArtSync for MinUI</h1>
  <p>Desktop app that auto-downloads boxart from <a href="https://www.steamgriddb.com/">SteamGridDB</a> for your MinUI ROM collection.</p>
  <img src="https://img.shields.io/badge/platform-Windows-blue" alt="Platform">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
</div>

## Features

- **Auto-scan** — detects all supported platforms and ROMs on your SD card
- **SteamGridDB integration** — searches and downloads boxart automatically
- **Manual upload** — use your own images for any game
- **Batch sync** — download all missing art in one click with live progress
- **Platform filter chips** — focus on specific platforms; sync count updates accordingly
- **Keyboard navigation** — browse games with ↑↓ arrow keys
- **Current art preview** — installed art appears pre-selected with a green badge in the grid
- Supports both **vertical** (2:3) and **horizontal** art formats

## Download

Go to the [Releases page](https://github.com/Nivek-GP/ArtSync/releases) and download the installer for your platform:

| Platform | File |
| -- | -- |
| Windows | `ArtSync-x.x.x-setup.exe` |

## Usage

1. **ROM Folder** — click **ROMs** and select the root folder containing your platform subfolders (e.g. `F:\Roms`)
2. **API Key** — paste your SteamGridDB API key
3. Choose **Vertical** or **Horizontal** art format
4. Click a game to browse available artwork — your current art appears pre-selected
5. Click **↓ Download selected** to save one, or **Sync All** to download everything missing at once

### Art file placement

ArtSync saves images where MinUI expects them:

```
{RomsRoot}/{Platform}/.res/{game}.png
```

MinUI reads the art file named after what it shows as the game entry:

- Single-file game (`SFC/Game.sfc`) → `SFC/.res/Game.sfc.png`
- Multi-disc / subfolder game (`PS/GameFolder/game.m3u`) → `PS/.res/GameFolder.png`

### SteamGridDB API Key

A free API key is required. Generate one at **SteamGridDB → Profile → Preferences → API** or visit [steamgriddb.com/profile/preferences/api](https://www.steamgriddb.com/profile/preferences/api).

## Supported platforms

| Tag | System |
| -- | -- |
| PS | Sony PlayStation |
| PSP | PlayStation Portable |
| GBA | Nintendo Game Boy Advance |
| MGBA | Nintendo Game Boy Advance (mGBA) |
| SFC | Super Nintendo |
| SUPA | Super Nintendo (alt) |
| SGB | Super Game Boy |
| GBC | Game Boy Color |
| GB | Game Boy |
| FC | Nintendo Entertainment System |
| N64 | Nintendo 64 |
| NDS | Nintendo DS |
| VB | Nintendo Virtual Boy |
| MD | Sega Mega Drive / Genesis |
| SMS | Sega Master System |
| DC | Sega Dreamcast |
| GG | Sega Game Gear |
| PCE | NEC TurboGrafx-16 / PC Engine |
| NGPC | SNK Neo Geo Pocket Color |
| P8 | Pico-8 |
| PKM | Pokémon mini |
| FBNEO | Arcade (FinalBurn Neo) |
| VARCADE | Vertical Arcade |

## Building from source

```bash
npm install
npm run dev             # development with hot-reload
npm run build:win       # Windows installer (.exe)
npm run generate-icons  # regenerate app icons from SVG
```

> Windows builds must be run on Windows.

## Related

- [MinUI — Miyoo Flip Enhanced](https://github.com/Nivek-GP/MinUI-Miyoo-Flip-Enhanced) — the MinUI fork this tool was built for
- [CheatSync for MinUI](https://github.com/Nivek-GP/CheatSync) — companion app to sync cheat files
- [SteamGridDB](https://www.steamgriddb.com/) — source of all artwork
