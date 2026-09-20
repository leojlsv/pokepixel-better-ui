const { app, BrowserWindow, BrowserView, session } = require("electron");
const http = require("node:http");
const path = require("node:path");

const timeoutMs = 10000;

function waitForLoad(view, side) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${side} timed out`)), timeoutMs);
    view.webContents.once("did-finish-load", () => {
      clearTimeout(timer);
      resolve(view.webContents.getURL());
    });
    view.webContents.once("did-fail-load", (_event, code, description, url, isMainFrame) => {
      if (!isMainFrame) return;
      clearTimeout(timer);
      reject(new Error(`${side} failed ${code} ${description} ${url}`));
    });
    view.webContents.once("render-process-gone", (_event, details) => {
      clearTimeout(timer);
      reject(new Error(`${side} renderer gone ${details.reason}`));
    });
  });
}

const server = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end("<!doctype html><html><head><title>Local Remote Smoke</title></head><body>remote</body></html>");
});

server.listen(0, "127.0.0.1", () => {
  const { port } = server.address();
  const target = `http://127.0.0.1:${port}/`;

  app.whenReady().then(async () => {
    const smokeExtension = path.join(__dirname, "smoke-extension");
    const betterUiExtension = path.join(__dirname, "extension");
    const leftSession = session.fromPartition("persist:local-remote-smoke-left");
    const rightSession = session.fromPartition("persist:local-remote-smoke-right");
    await Promise.all([
      leftSession.extensions.loadExtension(smokeExtension),
      rightSession.extensions.loadExtension(smokeExtension),
      leftSession.extensions.loadExtension(betterUiExtension),
      rightSession.extensions.loadExtension(betterUiExtension),
    ]);

    const win = new BrowserWindow({ show: false, width: 1000, height: 700 });
    const left = new BrowserView({
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
        partition: "persist:local-remote-smoke-left",
      },
    });
    const right = new BrowserView({
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
        partition: "persist:local-remote-smoke-right",
      },
    });
    win.addBrowserView(left);
    win.addBrowserView(right);
    left.setBounds({ x: 0, y: 0, width: 496, height: 700 });
    right.setBounds({ x: 504, y: 0, width: 496, height: 700 });

    try {
      const leftLoad = waitForLoad(left, "left");
      const rightLoad = waitForLoad(right, "right");
      left.webContents.loadURL(target);
      right.webContents.loadURL(target);
      await Promise.all([leftLoad, rightLoad]);
      const titles = [left.webContents.getTitle(), right.webContents.getTitle()];
      if (!titles.every((title) => title === "Local Remote Smoke")) {
        throw new Error(`Unexpected titles: ${titles.join(", ")}`);
      }
      const markers = await Promise.all([
        left.webContents.executeJavaScript("window.__COUPLED_EXTENSION_MAIN_WORLD__", true),
        right.webContents.executeJavaScript("window.__COUPLED_EXTENSION_MAIN_WORLD__", true),
      ]);
      if (!markers.every((marker) => marker === "ok")) {
        throw new Error(`MAIN-world markers missing: ${markers.join(", ")}`);
      }
      console.log("Sandboxed BrowserView HTTP + extension MAIN-world smoke: PASS");
    } finally {
      left.webContents.close();
      right.webContents.close();
      win.destroy();
      server.close();
      app.quit();
    }
  }).catch((error) => {
    console.error(error);
    server.close();
    app.exit(1);
  });
});
