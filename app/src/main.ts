import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import started from 'electron-squirrel-startup';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (started) {
  app.quit();
}

/** Only HTTP(S) — renderer is trusted, but block file:// and odd schemes */
function isAllowedMasterUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function registerMasterIpc(): void {
  // Idempotent: dev / hot paths may load main more than once
  ipcMain.removeHandler('master:request');
  ipcMain.handle(
    'master:request',
    async (
      _event,
      payload: {
        url: string;
        method: string;
        headers: Record<string, string>;
        body?: string;
      },
    ) => {
      if (!isAllowedMasterUrl(payload.url)) {
        throw new Error(`Blocked non-HTTP(S) URL: ${payload.url}`);
      }
      const res = await fetch(payload.url, {
        method: payload.method,
        headers: payload.headers,
        body: payload.body,
      });
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        headers[k.toLowerCase()] = v;
      });
      const buf = new Uint8Array(await res.arrayBuffer());
      return {
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        headers,
        body: buf,
      };
    },
  );
}

// Register as soon as main loads — before `app.whenReady()` — so invokes never race a late handler
registerMasterIpc();

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Master API uses main-process `fetch` via IPC (`master:request`) — no need to relax webSecurity
      webSecurity: true,
    },
  });

  Menu.setApplicationMenu(null);

  if (
    typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined' &&
    MAIN_WINDOW_VITE_DEV_SERVER_URL
  ) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  mainWindow.webContents.openDevTools();
};

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
