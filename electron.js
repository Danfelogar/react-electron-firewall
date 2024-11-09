const { app, BrowserWindow, ipcMain } = require("electron");
const http = require("http");
const httpProxy = require("http-proxy");
const path = require("path");

let isDev;
let mainWindow;
const blockedDomains = [];
const proxy = httpProxy.createProxyServer({});

(async () => {
  isDev = (await import("electron-is-dev")).default;
  createWindow();
  startProxyServer(); // Inicia el servidor proxy
})();

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
}

function startProxyServer() {
  const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const domain = parsedUrl.hostname;

    // Verifica si el dominio está bloqueado
    if (blockedDomains.includes(domain)) {
      res.writeHead(403, { "Content-Type": "text/plain" });
      res.end("Domain is blocked");
      console.log(`Blocked request to: ${domain}`);
    } else {
      // Redirige la solicitud a su destino real
      proxy.web(req, res, { target: req.url });
    }
  });

  server.listen(8080, () => {
    console.log("Proxy server running on http://localhost:8080");
  });
}

ipcMain.on("block-domain", (event, domain) => {
  blockedDomains.push(domain);
  console.log(`Domain blocked: ${domain}`);
});

ipcMain.on("unblock-domain", (event, domain) => {
  const index = blockedDomains.indexOf(domain);
  if (index !== -1) {
    blockedDomains.splice(index, 1);
    console.log(`Domain unblocked: ${domain}`);
  }
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
