const { app, BrowserWindow, shell, dialog, Tray, Menu, nativeImage } =
  require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { createManager, APP_URL } = require("./server-manager.cjs");

// Keep the existing data location when renaming the displayed product.
const previousUserDataPath = path.join(app.getPath("appData"), "Hesabdari");
const renamedUserDataPath = path.join(app.getPath("appData"), "Saman");
const legacyUserDataPath = !fs.existsSync(renamedUserDataPath) && fs.existsSync(previousUserDataPath)
  ? previousUserDataPath
  : renamedUserDataPath;
fs.mkdirSync(legacyUserDataPath, { recursive: true });
app.setPath("userData", legacyUserDataPath);

// Faster Chromium startup on Windows desktop shells
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("disable-features", "CalculateNativeWinOcclusion");

const pkg = (() => {
  try {
    return require("../package.json");
  } catch {
    return { version: "0.0.0" };
  }
})();

const startHidden =
  process.argv.includes("--hidden") || process.argv.includes("--warmup");

let mainWindow = null;
let tray = null;
let isQuitting = false;
let mgr = null;
let opening = false;
let appLoaded = false;

function loadingHtml() {
  return `data:text/html;charset=utf-8,${encodeURIComponent(`<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>روال | Ravaal Life OS</title>
  <style>
    html,body{height:100%;margin:0;font-family:Tahoma,Segoe UI,sans-serif;
      background:linear-gradient(160deg,#042f2e 0%,#064e3b 45%,#011b15 100%);
      color:#ecfdf5;display:flex;align-items:center;justify-content:center}
    .box{text-align:center}
    .spin{width:32px;height:32px;border:3px solid rgba(255,255,255,.2);
      border-top-color:#34d399;border-radius:50%;margin:16px auto 0;
      animation:r .6s linear infinite}
    @keyframes r{to{transform:rotate(360deg)}}
    h1{font-size:24px;margin:0 0 4px;font-weight:800}
    p{margin:0;opacity:.8;font-size:13px}
    .tag{display:inline-block;background:rgba(16,185,129,0.2);border:1px solid rgba(16,185,129,0.4);color:#6ee7b7;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:bold;margin-bottom:8px}
  </style>
</head>
<body>
  <div class="box">
    <h1>روال</h1>
    <div><span class="tag">Life OS</span></div>
    <div class="spin"></div>
    <p style="margin-top:14px">در حال آماده‌سازی سامانه زندگی و مالی...</p>
  </div>
</body>
</html>`)}`;
}

function trayIcon() {
  const iconPath = path.join(__dirname, "icon.png");
  if (fs.existsSync(iconPath)) {
    const img = nativeImage.createFromPath(iconPath);
    if (!img.isEmpty()) return img;
  }
  return nativeImage.createEmpty();
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function windowHasApp() {
  if (!mainWindow || mainWindow.isDestroyed() || !appLoaded) return false;
  try {
    const url = mainWindow.webContents.getURL();
    return typeof url === "string" && url.startsWith(APP_URL);
  } catch {
    return false;
  }
}

function createWindow(showSplash) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    showMainWindow();
    return mainWindow;
  }

  appLoaded = false;
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    title: "روال | Ravaal Life OS",
    icon: path.join(__dirname, "icon.png"),
    show: true,
    autoHideMenuBar: true,
    backgroundColor: "#0f766e",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      spellcheck: false,
      v8CacheOptions: "code",
    },
  });

  if (showSplash) mainWindow.loadURL(loadingHtml());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("close", (e) => {
    if (isQuitting) return;
    e.preventDefault();
    // Keep page in memory — next open is instant (no reload)
    mainWindow.hide();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    appLoaded = false;
  });

  return mainWindow;
}

function createTray() {
  if (tray) return;
  tray = new Tray(trayIcon());
  tray.setToolTip("روال | Ravaal Life OS");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "باز کردن", click: () => openApp() },
      { type: "separator" },
      {
        label: "خروج کامل (بستن سرور)",
        click: () => quitFully(),
      },
    ])
  );
  tray.on("double-click", () => openApp());
  tray.on("click", () => openApp());
}

async function navigateToApp() {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  // Already showing the app — just focus (fastest path)
  if (windowHasApp()) {
    showMainWindow();
    return;
  }

  await mainWindow.loadURL(APP_URL);
  appLoaded = true;
  showMainWindow();
}

async function openApp() {
  if (opening) return;

  // Instant path: window still in memory with app loaded
  if (windowHasApp()) {
    showMainWindow();
    // Revive server in background if it died
    mgr.isServerUp().then((up) => {
      if (!up) mgr.ensureServer().catch(() => {});
    });
    return;
  }

  opening = true;
  try {
    const warm = await mgr.isServerUp();
    createWindow(!warm);
    if (!warm) await mgr.ensureServer();
    await navigateToApp();
  } catch (err) {
    dialog.showErrorBox(
      "Hesabdari",
      `Could not start:\n${err instanceof Error ? err.message : String(err)}\n\nLog:\n${mgr?.logFile || ""}`
    );
  } finally {
    opening = false;
  }
}

function installWarmStartLight() {
  try {
    const userData = app.getPath("userData");
    const warmupSrc = path.join(__dirname, "warmup-node.cjs");
    const warmupDst = path.join(userData, "warmup-node.cjs");
    fs.copyFileSync(warmupSrc, warmupDst);

    const nodeBin = mgr.resolveNodeBinary();
    let serverCwd;
    try {
      const cfg = JSON.parse(
        fs.readFileSync(path.join(userData, "launch.json"), "utf8")
      );
      serverCwd = cfg.cwd;
    } catch {
      serverCwd = app.isPackaged
        ? path.join(process.resourcesPath, "server")
        : path.join(__dirname, "..", ".next", "standalone");
    }
    // Always re-assert dataDir in launch.json (never point elsewhere)
    mgr.persistLaunchConfig(nodeBin, serverCwd);

    if (process.platform === "win32") {
      const cmd = `"${nodeBin}" "${warmupDst}"`;
      spawn(
        "reg",
        [
          "add",
          "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
          "/v",
          "HesabdariServer",
          "/t",
          "REG_SZ",
          "/d",
          cmd,
          "/f",
        ],
        { windowsHide: true, stdio: "ignore" }
      );
    }

    mgr.mirrorRuntimeInBackground();
  } catch {
    // ignore
  }
}

function quitFully() {
  isQuitting = true;
  try {
    mgr?.stopServer();
  } catch {
    // ignore
  }
  if (tray) {
    tray.destroy();
    tray = null;
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.destroy();
  }
  app.quit();
}

async function boot() {
  const currentUserData = app.getPath("userData");
  const oldUserData = path.join(app.getPath("appData"), "Hesabdari");
  if (!fs.existsSync(currentUserData) && fs.existsSync(oldUserData)) {
    try {
      fs.cpSync(oldUserData, currentUserData, { recursive: true });
    } catch (e) {
      console.error("Data migration error:", e);
    }
  }

  mgr = createManager({
    isPackaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
    userDataPath: currentUserData,
    projectRootDev: path.join(__dirname, ".."),
    appVersion: String(pkg.version || "0.0.0"),
  });

  createTray();

  if (startHidden) {
    try {
      await mgr.ensureServer();
      installWarmStartLight();
    } catch (err) {
      console.error(err);
    }
    return;
  }

  const already = await mgr.isServerUp();
  if (already) {
    createWindow(false);
    try {
      await navigateToApp();
      setImmediate(installWarmStartLight);
      return;
    } catch {
      // fall through
    }
  }

  const serverPromise = mgr.ensureServer();
  createWindow(true);
  try {
    await serverPromise;
    await navigateToApp();
    setImmediate(installWarmStartLight);
  } catch (err) {
    dialog.showErrorBox(
      "Hesabdari",
      `Could not start:\n${err instanceof Error ? err.message : String(err)}\n\nLog:\n${mgr.logFile}`
    );
    quitFully();
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    const hidden = argv.includes("--hidden") || argv.includes("--warmup");
    if (!hidden) openApp();
  });

  app.whenReady().then(boot);
  app.on("window-all-closed", () => {});
  app.on("before-quit", () => {
    isQuitting = true;
  });
}
