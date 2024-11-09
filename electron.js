const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const sudo = require("sudo-prompt");

let isDev;
let mainWindow;
let blockedDomains = [];
const hostsFilePath = "/etc/hosts";
const hostsBackupPath = path.join(app.getPath("userData"), "hosts_backup");

(async () => {
  isDev = (await import("electron-is-dev")).default;
  createWindow();
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

// Function to read and backup the original hosts file
function backupHostsFile() {
  if (fs.existsSync(hostsFilePath)) {
    fs.copyFileSync(hostsFilePath, hostsBackupPath);
  }
}

// Function to restore the original hosts file
function restoreHostsFile() {
  if (fs.existsSync(hostsBackupPath)) {
    fs.copyFileSync(hostsBackupPath, hostsFilePath);
  }
}

// Function to modify the hosts file
function modifyHostsFile() {
  let hostsContent = fs.readFileSync(hostsFilePath, "utf8");
  let newHostsContent = hostsContent;

  // Remove previous blocked domains entries
  blockedDomains.forEach((domain) => {
    const regex = new RegExp(`^127.0.0.1\\s+${domain}`, "gm");
    newHostsContent = newHostsContent.replace(regex, "");
  });

  blockedDomains.forEach((domain) => {
    newHostsContent += `\n127.0.0.1 ${domain}`;
  });

  sudo.exec(
    `echo "${newHostsContent.trim()}" | sudo tee ${hostsFilePath}`,
    { name: "URL Blocker" },
    (error) => {
      if (error) {
        console.error("Failed to modify hosts file:", error);
      } else {
        console.log("Hosts file updated successfully.");
      }
    }
  );
}

ipcMain.on("block-domain", (event, domain) => {
  // Ensure domain format is correct
  domain = domain.replace(/https?:\/\//, "").replace(/\/$/, "");
  if (!blockedDomains.includes(domain)) {
    blockedDomains.push(domain);
    modifyHostsFile();
    console.log(`Domain blocked: ${domain}`);
  }
});

ipcMain.on("unblock-domain", (event, domain) => {
  domain = domain.replace(/https?:\/\//, "").replace(/\/$/, "");
  blockedDomains = blockedDomains.filter((d) => d !== domain);
  modifyHostsFile();
  console.log(`Domain unblocked: ${domain}`);
});

app.whenReady().then(() => {
  backupHostsFile();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    restoreHostsFile();
    app.quit();
  }
});

app.on("before-quit", () => {
  restoreHostsFile();
});
