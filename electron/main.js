import { app, BrowserWindow } from "electron";

const devUrl = "http://localhost:5173";

const authWindowSize = {
  width: 540,
  height: 760,
  minWidth: 500,
  minHeight: 680,
};

const chatWindowSize = {
  width: 1400,
  height: 900,
  minWidth: 1100,
  minHeight: 720,
};

function createWindow() {
  const window = new BrowserWindow({
    ...authWindowSize,
    backgroundColor: "#1e1e1e",
    title: "Chat App",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const setWindowSizeForRoute = (url) => {
    const isChatRoute = new URL(url).pathname === "/chat";
    const size = isChatRoute ? chatWindowSize : authWindowSize;

    window.setMinimumSize(size.minWidth, size.minHeight);
    window.setSize(size.width, size.height);
    window.center();
  };

  window.webContents.on("did-finish-load", () => {
    setWindowSizeForRoute(window.webContents.getURL());
  });

  window.webContents.on("did-navigate-in-page", (_, url) => {
    setWindowSizeForRoute(url);
  });

  if (app.isPackaged) {
    window.loadFile("client/dist/index.html");
  } else {
    window.loadURL(devUrl);
    window.webContents.openDevTools({ mode: "detach" });
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});