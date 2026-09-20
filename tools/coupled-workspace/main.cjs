const {
  app,
  BrowserWindow,
  BrowserView,
  ipcMain,
  session,
} = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const configText = fs
  .readFileSync(path.join(__dirname, "config.json"), "utf8")
  .replace(/^\uFEFF/, "");
const config = JSON.parse(configText);
const targetUrl = new URL(config.targetUrl);
if (
  targetUrl.protocol !== "https:" ||
  targetUrl.hostname !== "pokepixel.nietore.com"
) {
  throw new Error(
    "config.targetUrl must use https://pokepixel.nietore.com/.",
  );
}
const targetOrigin = targetUrl.origin;
const extensionDir = path.join(__dirname, "extension");

app.setName("PokePixel Coupled Workspace");

let win;
let leftView;
let rightView;
const toolbarHeight = 44;
const dividerWidth = 8;
let splitRatio = 0.5;
const paneStates = {
  left: { status: "idle" },
  right: { status: "idle" },
};

function isAllowedGameUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === "https:" && parsed.origin === targetOrigin;
  } catch {
    return false;
  }
}

function secureRemoteView(view) {
  view.webContents.on("will-navigate", (event, url) => {
    if (!isAllowedGameUrl(url)) event.preventDefault();
  });
  view.webContents.on("will-redirect", (event, url) => {
    if (!isAllowedGameUrl(url)) event.preventDefault();
  });
  view.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
}

function clampSplit(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0.5;
  return Math.max(0.2, Math.min(0.8, numeric));
}

function sendState(extra = {}) {
  if (!win || win.isDestroyed()) return;
  win.webContents.send("workspace:state", {
    splitRatio,
    extensionLoaded: true,
    paneStates,
    ...extra,
  });
}

function layout() {
  if (!win || !leftView || !rightView) return;
  const [width, height] = win.getContentSize();
  const paneHeight = Math.max(0, height - toolbarHeight);
  const usableWidth = Math.max(0, width - dividerWidth);
  const leftWidth = Math.floor(usableWidth * splitRatio);
  const rightWidth = usableWidth - leftWidth;
  leftView.setBounds({ x: 0, y: toolbarHeight, width: leftWidth, height: paneHeight });
  rightView.setBounds({ x: leftWidth + dividerWidth, y: toolbarHeight, width: rightWidth, height: paneHeight });
  sendState({ dividerX: leftWidth, dividerWidth });
}

function setPaneState(side, state) {
  paneStates[side] = state;
  sendState();
}

function observePane(view, side) {
  view.webContents.on("did-start-loading", () => {
    setPaneState(side, { status: "loading" });
  });
  view.webContents.on("did-finish-load", () => {
    console.log(
      `[CoupledWorkspace] ${side} loaded: ${view.webContents.getURL()}`,
    );
    setPaneState(side, {
      status: "loaded",
      url: view.webContents.getURL(),
    });
  });
  view.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (!isMainFrame) return;
      console.error(
        `[CoupledWorkspace] ${side} load failed: ${errorCode} ${errorDescription} ${validatedURL}`,
      );
      setPaneState(side, {
        status: "error",
        errorCode,
        errorDescription,
        url: validatedURL,
      });
    },
  );
  view.webContents.on("render-process-gone", (_event, details) => {
    console.error(
      `[CoupledWorkspace] ${side} renderer gone: ${details.reason}`,
    );
    setPaneState(side, {
      status: "error",
      errorDescription: `Renderer gone: ${details.reason}`,
    });
  });
}

app.whenReady().then(async () => {
  if (
    typeof config.leftSession !== "string" ||
    typeof config.rightSession !== "string" ||
    !config.leftSession.startsWith("persist:") ||
    !config.rightSession.startsWith("persist:") ||
    config.leftSession === config.rightSession
  ) {
    throw new Error("Coupled workspace requires two distinct persistent session partitions.");
  }

  const leftSession = session.fromPartition(config.leftSession);
  const rightSession = session.fromPartition(config.rightSession);

  await Promise.all([
    leftSession.extensions.loadExtension(extensionDir),
    rightSession.extensions.loadExtension(extensionDir),
  ]);

  for (const paneSession of [leftSession, rightSession]) {
    paneSession.setPermissionRequestHandler((_contents, _permission, callback) => {
      callback(false);
    });
    paneSession.setPermissionCheckHandler(() => false);
  }

  win = new BrowserWindow({
    width: 1600,
    height: 960,
    minWidth: 1180,
    minHeight: 600,
    autoHideMenuBar: true,
    backgroundColor: "#232228",
    title: "PokePixel Coupled Workspace",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
    },
  });
  leftView = new BrowserView({
    webPreferences: {
      partition: config.leftSession,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });
  rightView = new BrowserView({
    webPreferences: {
      partition: config.rightSession,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });
  secureRemoteView(leftView);
  secureRemoteView(rightView);
  observePane(leftView, "left");
  observePane(rightView, "right");
  win.addBrowserView(leftView);
  win.addBrowserView(rightView);
  win.on("resize", layout);
  win.on("closed", () => {
    for (const view of [leftView, rightView]) {
      if (view && !view.webContents.isDestroyed()) view.webContents.close();
    }
    leftView = null;
    rightView = null;
    win = null;
  });
  await win.loadFile(path.join(__dirname, "shell.html"));
  layout();
  sendState();
  await Promise.allSettled([
    leftView.webContents.loadURL(config.targetUrl),
    rightView.webContents.loadURL(config.targetUrl),
  ]);
});

function isShellSender(event) {
  return Boolean(
    win &&
    !win.isDestroyed() &&
    event.sender === win.webContents
  );
}

ipcMain.handle("workspace:get-state", (event) => {
  if (!isShellSender(event)) return null;
  return {
    splitRatio,
    extensionLoaded: true,
    paneStates,
  };
});

ipcMain.on("workspace:set-split", (event, value) => {
  if (!isShellSender(event)) return;
  splitRatio = clampSplit(value);
  layout();
});

ipcMain.on("workspace:command", (event, payload) => {
  if (!isShellSender(event)) return;
  const view = payload?.side === "left"
    ? leftView
    : payload?.side === "right"
      ? rightView
      : null;
  if (!view || view.webContents.isDestroyed()) return;

  if (payload.action === "reload") {
    view.webContents.reload();
  } else if (payload.action === "home") {
    view.webContents.loadURL(config.targetUrl);
  } else if (payload.action === "devtools") {
    if (view.webContents.isDevToolsOpened()) view.webContents.closeDevTools();
    else view.webContents.openDevTools({ mode: "detach" });
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
