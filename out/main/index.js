"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const utils = require("@electron-toolkit/utils");
const Jimp = require("jimp");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const icon = path.join(__dirname, "../../resources/icon.png");
const ALL_PLATFORMS = [
  { match: "PlayStation (PS)", tag: "PS" },
  { match: "Game Boy Advance (GBA)", tag: "GBA" },
  { match: "Super Nintendo", tag: "SFC" },
  { match: "Game Boy Color", tag: "GBC" },
  { match: "Game Boy", tag: "GB" },
  { match: "Nintendo (FC)", tag: "FC" },
  { match: "Sega Genesis", tag: "MD" },
  { match: "Sega Master System", tag: "SMS" },
  { match: "Game Gear", tag: "GG" },
  { match: "PC Engine", tag: "PCE" },
  { match: "Neo Geo Pocket", tag: "NGP" }
];
const ROM_EXTS = /* @__PURE__ */ new Set([
  ".bin",
  ".cue",
  ".iso",
  ".pbp",
  ".chd",
  ".img",
  ".cso",
  ".smc",
  ".sfc",
  ".gb",
  ".gbc",
  ".gba",
  ".nes",
  ".fds",
  ".md",
  ".sms",
  ".gg",
  ".pce",
  ".ngp",
  ".ngc",
  ".m3u"
]);
function getResPath(romsRoot, folderName, subDir, filename) {
  if (subDir) {
    const topDir = subDir.split(path__namespace.sep)[0];
    return path__namespace.join(romsRoot, folderName, ".res", topDir + ".png");
  }
  return path__namespace.join(romsRoot, folderName, ".res", filename + ".png");
}
function getBaseName(name) {
  return name.replace(/\s*\([^)]*\)/g, "").replace(/\s*\[[^\]]*\]/g, "").trim().replace(/\s+/g, " ");
}
function findFilesRecursive(dir, filter) {
  const results = [];
  try {
    for (const e of fs__namespace.readdirSync(dir, { withFileTypes: true })) {
      const full = path__namespace.join(dir, e.name);
      if (e.isDirectory()) results.push(...findFilesRecursive(full, filter));
      else if (e.isFile() && !e.name.startsWith("._") && filter(e.name)) results.push(full);
    }
  } catch {
  }
  return results;
}
function scanGames(romDir, romsRoot, folderName) {
  const games = [];
  const coveredDirs = /* @__PURE__ */ new Set();
  for (const f of findFilesRecursive(romDir, (n) => n.toLowerCase().endsWith(".m3u"))) {
    const filename = path__namespace.basename(f);
    const subDir = path__namespace.relative(romDir, path__namespace.dirname(f));
    games.push({ filename, hasArt: fs__namespace.existsSync(getResPath(romsRoot, folderName, subDir, filename)), subDir });
    coveredDirs.add(path__namespace.dirname(f));
  }
  for (const f of findFilesRecursive(romDir, (n) => n.toLowerCase().endsWith(".cue"))) {
    const dir = path__namespace.dirname(f);
    if (dir !== romDir && !coveredDirs.has(dir)) {
      const filename = path__namespace.basename(f);
      const subDir = path__namespace.relative(romDir, dir);
      games.push({ filename, hasArt: fs__namespace.existsSync(getResPath(romsRoot, folderName, subDir, filename)), subDir });
      coveredDirs.add(dir);
    }
  }
  for (const f of findFilesRecursive(romDir, (n) => ROM_EXTS.has(path__namespace.extname(n).toLowerCase()))) {
    const dir = path__namespace.dirname(f);
    const filename = path__namespace.basename(f);
    if (coveredDirs.has(dir)) continue;
    if (/\(Track\s*\d+\)/i.test(filename)) continue;
    const subDir = path__namespace.relative(romDir, dir);
    games.push({ filename, hasArt: fs__namespace.existsSync(getResPath(romsRoot, folderName, subDir, filename)), subDir });
  }
  return games.sort(
    (a, b) => a.filename.replace(/\.[^.]+$/, "").localeCompare(b.filename.replace(/\.[^.]+$/, ""))
  );
}
function scanRoms(romsRoot) {
  const result = [];
  let entries;
  try {
    entries = fs__namespace.readdirSync(romsRoot, { withFileTypes: true });
  } catch {
    return result;
  }
  for (const platform of ALL_PLATFORMS) {
    const found = entries.find(
      (e) => e.isDirectory() && e.name.toLowerCase().includes(platform.match.toLowerCase())
    );
    if (!found) continue;
    const romDir = path__namespace.join(romsRoot, found.name);
    const games = scanGames(romDir, romsRoot, found.name);
    if (games.length === 0) continue;
    result.push({ tag: platform.tag, folderName: found.name, games });
  }
  return result;
}
async function fetchJson(url, sgdbKey) {
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${sgdbKey}`, "User-Agent": "ArtSync-MinUI" }
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}
async function downloadBuffer(url) {
  const resp = await fetch(url, { headers: { "User-Agent": "ArtSync-MinUI" } });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return Buffer.from(await resp.arrayBuffer());
}
async function resizeAndSave(imageBuffer, destPath, artType) {
  const targetWidth = artType === "vertical" ? 200 : 250;
  const image = await Jimp.read(imageBuffer);
  image.resize(targetWidth, Jimp.AUTO);
  const dir = path__namespace.dirname(destPath);
  if (!fs__namespace.existsSync(dir)) fs__namespace.mkdirSync(dir, { recursive: true });
  await image.writeAsync(destPath);
}
async function getGrids(gameFilename, artType, sgdbKey) {
  const nameNoExt = path__namespace.basename(gameFilename, path__namespace.extname(gameFilename));
  const searchTerm = encodeURIComponent(getBaseName(nameNoExt) || nameNoExt);
  const searchData = await fetchJson(
    `https://www.steamgriddb.com/api/v2/search/autocomplete/${searchTerm}`,
    sgdbKey
  );
  if (!searchData.data?.length) return [];
  const gameId = searchData.data[0].id;
  const dimensions = artType === "vertical" ? "600x900" : "920x430";
  const gridsData = await fetchJson(
    `https://www.steamgriddb.com/api/v2/grids/game/${gameId}?dimensions=${dimensions}&limit=10`,
    sgdbKey
  );
  if (!gridsData.data?.length) return [];
  return gridsData.data.map((g, i) => ({
    id: g.id,
    url: g.url,
    thumb: g.thumb,
    isBestMatch: i === 0
  }));
}
async function downloadGrid(romsRoot, folderName, subDir, gameFilename, gridUrl, artType) {
  const destPath = getResPath(romsRoot, folderName, subDir, gameFilename);
  const buffer = await downloadBuffer(gridUrl);
  await resizeAndSave(buffer, destPath, artType);
}
async function uploadArt(romsRoot, folderName, subDir, gameFilename, artType, filePath) {
  const buffer = fs__namespace.readFileSync(filePath);
  const destPath = getResPath(romsRoot, folderName, subDir, gameFilename);
  await resizeAndSave(buffer, destPath, artType);
}
let cancelFlag = false;
function cancelSync() {
  cancelFlag = true;
}
async function runSync(config, onProgress) {
  cancelFlag = false;
  const platforms = scanRoms(config.romsRoot).filter(
    (p) => config.platformTags.includes(p.tag)
  );
  const allGames = platforms.flatMap(
    (p) => p.games.filter((g) => !g.hasArt).map((g) => ({ platform: p, game: g }))
  );
  const total = allGames.length;
  let current = 0;
  let downloaded = 0;
  let skipped = 0;
  let noMatch = 0;
  for (const { platform, game } of allGames) {
    if (cancelFlag) break;
    current++;
    onProgress({ current, total, downloaded, skipped, noMatch, platformTag: platform.tag, filename: game.filename });
    try {
      const grids = await getGrids(game.filename, config.artType, config.sgdbKey);
      if (!grids.length) {
        noMatch++;
        continue;
      }
      await downloadGrid(config.romsRoot, platform.folderName, game.subDir, game.filename, grids[0].url, config.artType);
      downloaded++;
    } catch {
      noMatch++;
    }
    onProgress({ current, total, downloaded, skipped, noMatch, platformTag: platform.tag, filename: game.filename });
  }
}
function findOrphanedArt(romsRoot) {
  const platforms = scanRoms(romsRoot);
  const orphaned = [];
  for (const platform of platforms) {
    const resDir = path__namespace.join(romsRoot, platform.folderName, ".res");
    if (!fs__namespace.existsSync(resDir)) continue;
    const expected = new Set(
      platform.games.map((g) => path__namespace.basename(getResPath(romsRoot, platform.folderName, g.subDir, g.filename)))
    );
    for (const file of fs__namespace.readdirSync(resDir)) {
      if (file.startsWith("._")) continue;
      if (!file.endsWith(".png")) continue;
      if (!expected.has(file)) orphaned.push(path__namespace.join(resDir, file));
    }
  }
  return orphaned;
}
async function deleteFiles(filePaths) {
  for (const p of filePaths) await fs__namespace.promises.unlink(p);
}
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 560,
    show: false,
    autoHideMenuBar: true,
    title: "ArtSync for MinUI",
    icon,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(() => {
  utils.electronApp.setAppUserModelId("com.nivek-gp.artsync");
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  electron.ipcMain.handle("select-folder", async () => {
    const result = await electron.dialog.showOpenDialog({ properties: ["openDirectory"] });
    return result.canceled ? null : result.filePaths[0];
  });
  electron.ipcMain.handle("get-platforms", () => ALL_PLATFORMS);
  electron.ipcMain.handle("scan-roms", (_event, romsRoot) => {
    return scanRoms(romsRoot);
  });
  electron.ipcMain.handle("get-grids", async (_event, gameFilename, artType, sgdbKey) => {
    return getGrids(gameFilename, artType, sgdbKey);
  });
  electron.ipcMain.handle("read-art", (_event, romsRoot, folderName, subDir, gameFilename) => {
    const p = getResPath(romsRoot, folderName, subDir, gameFilename);
    if (!fs__namespace.existsSync(p)) return null;
    return "data:image/png;base64," + fs__namespace.readFileSync(p).toString("base64");
  });
  electron.ipcMain.handle("download-grid", async (_event, romsRoot, folderName, subDir, gameFilename, gridUrl, artType) => {
    await downloadGrid(romsRoot, folderName, subDir, gameFilename, gridUrl, artType);
  });
  electron.ipcMain.handle("upload-art", async (event, romsRoot, folderName, subDir, gameFilename, artType) => {
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    const result = await electron.dialog.showOpenDialog(win, {
      properties: ["openFile"],
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }]
    });
    if (result.canceled || !result.filePaths[0]) return false;
    await uploadArt(romsRoot, folderName, subDir, gameFilename, artType, result.filePaths[0]);
    return true;
  });
  electron.ipcMain.handle("start-sync", async (event, config) => {
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    await runSync(config, (progress) => {
      win?.webContents.send("sync-progress", progress);
    });
  });
  electron.ipcMain.on("cancel-sync", () => cancelSync());
  electron.ipcMain.handle("find-orphaned-art", (_event, romsRoot) => findOrphanedArt(romsRoot));
  electron.ipcMain.handle("delete-orphaned-art", async (_event, files) => {
    await deleteFiles(files);
  });
  electron.ipcMain.handle("open-external", (_event, url) => {
    electron.shell.openExternal(url);
  });
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
});
