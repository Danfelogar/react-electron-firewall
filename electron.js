const { app, BrowserWindow, session, ipcMain } = require("electron");
const path = require("path");

let isDev;

(async () => {
  isDev = (await import("electron-is-dev")).default;
  createWindow();
})();

let mainWindow;
const blockedDomains = [];

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });

  const startURL = isDev
    ? "http://localhost:3000"
    : `file://${path.join(__dirname, "build/index.html")}`;
  mainWindow.loadURL(startURL);

  mainWindow.on("closed", () => (mainWindow = null));
}

app.on("ready", () => {
  createWindow();

  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const { hostname } = new URL(details.url);
    if (blockedDomains.includes(hostname)) {
      return callback({ cancel: true });
    }
    return callback({});
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.on("block-domain", (event, domain) => {
  blockedDomains.push(domain);
});
