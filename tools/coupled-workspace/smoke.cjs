const { app, BrowserWindow, BrowserView, ipcMain } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

app.whenReady().then(async () => {
  const smokeExtension = path.join(__dirname, "smoke-extension");
  const betterUiExtension = path.join(__dirname, "extension");
  const win = new BrowserWindow({
    show: false,
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
    },
  });
  const left = new BrowserView({
    webPreferences: {
      partition: "persist:smoke-left",
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });
  const right = new BrowserView({
    webPreferences: {
      partition: "persist:smoke-right",
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });
  ipcMain.handle("workspace:get-state", () => ({
    splitRatio: 0.5,
    extensionLoaded: true,
    paneStates: {
      left: { status: "loaded" },
      right: { status: "loaded" },
    },
  }));
  ipcMain.on("workspace:set-split", () => {});
  ipcMain.on("workspace:command", () => {});
  await Promise.all([
    left.webContents.session.extensions.loadExtension(smokeExtension, { allowFileAccess: true }),
    right.webContents.session.extensions.loadExtension(smokeExtension, { allowFileAccess: true }),
    left.webContents.session.extensions.loadExtension(betterUiExtension),
    right.webContents.session.extensions.loadExtension(betterUiExtension),
  ]);
  win.addBrowserView(left);
  win.addBrowserView(right);

  left.setBounds({ x: 0, y: 44, width: 496, height: 656 });
  right.setBounds({ x: 504, y: 44, width: 496, height: 656 });

  const pageUrl = pathToFileURL(path.join(__dirname, "smoke-page.html")).href;
  await Promise.all([
    win.loadFile(path.join(__dirname, "shell.html")),
    left.webContents.loadURL(pageUrl),
    right.webContents.loadURL(pageUrl),
  ]);

  const leftBounds = left.getBounds();
  const rightBounds = right.getBounds();
  if (
    leftBounds.y !== 44 ||
    leftBounds.width !== 496 ||
    rightBounds.x !== 504
  ) {
    throw new Error("BrowserView bounds did not apply as expected.");
  }
  if (left.webContents.session === right.webContents.session) {
    throw new Error("Pane sessions are not isolated.");
  }
  const [leftMarker, rightMarker] = await Promise.all([
    left.webContents.executeJavaScript("window.__COUPLED_EXTENSION_MAIN_WORLD__", true),
    right.webContents.executeJavaScript("window.__COUPLED_EXTENSION_MAIN_WORLD__", true),
  ]);
  if (leftMarker !== "ok" || rightMarker !== "ok") {
    throw new Error("Extension content script did not execute in MAIN world.");
  }
  const shellReady = await win.webContents.executeJavaScript(
    "document.querySelector('.toolbar') !== null && document.querySelector('#left-status')?.textContent === 'Loaded'",
    true,
  );
  if (!shellReady) {
    throw new Error("Shell toolbar did not render or receive pane state.");
  }

  left.webContents.close();
  right.webContents.close();
  win.destroy();
  console.log("Coupled workspace smoke: PASS");
  app.quit();
});
