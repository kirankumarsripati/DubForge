import { app, BrowserWindow, shell } from 'electron';
import { join } from 'node:path';
import { createApplicationContainer } from './container';
import { registerPipelineIpcHandlers } from './ipc/pipeline-handlers';
import {
  registerPrivilegedSchemes,
  registerThumbnailProtocol,
  registerVideoIpcHandlers,
} from './ipc/video-handlers';

const isDev = !app.isPackaged;

registerPrivilegedSchemes();

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: '#0B0B0C',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

void app.whenReady().then(() => {
  app.setName('DubForge');

  const container = createApplicationContainer();
  registerThumbnailProtocol(container);
  registerVideoIpcHandlers(container);
  registerPipelineIpcHandlers(container);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
