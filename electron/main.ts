import { app, BrowserWindow, shell, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import { loadWindowState, saveWindowState } from './window-state';

// Extend App type for custom property
declare global {
  namespace Electron {
    interface App {
      isQuitting?: boolean;
    }
  }
}

// Keep references to prevent garbage collection
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// Detect development mode
const isDev = !app.isPackaged;

// App URL - uses Vercel deployment in production, localhost in dev
const APP_URL = isDev
  ? 'http://localhost:3000'
  : 'https://chrononaut-psi.vercel.app';

function createWindow(): void {
  const windowState = loadWindowState();

  mainWindow = new BrowserWindow({
    width: windowState.width || 1400,
    height: windowState.height || 900,
    x: windowState.x,
    y: windowState.y,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    vibrancy: 'sidebar',
    backgroundColor: '#FAF8F5',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    show: false,
  });

  mainWindow.loadURL(APP_URL);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  mainWindow.on('resize', () => {
    if (mainWindow) saveWindowState(mainWindow);
  });
  mainWindow.on('move', () => {
    if (mainWindow) saveWindowState(mainWindow);
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes('accounts.google.com') ||
        url.includes('api.ticktick.com') ||
        url.includes('api.prod.whoop.com')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    if (!url.startsWith(APP_URL) && !url.startsWith('http://localhost')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray(): void {
  const iconPath = isDev
    ? path.join(__dirname, '../public/icons/tray-iconTemplate.png')
    : path.join(process.resourcesPath!, 'icons/tray-iconTemplate.png');

  let trayIcon: Electron.NativeImage;
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    trayIcon = trayIcon.resize({ width: 16, height: 16 });
  } catch {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Chrononaut', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { type: 'separator' },
    { label: 'Dashboard', click: () => { mainWindow?.show(); mainWindow?.loadURL(`${APP_URL}/dashboard`); mainWindow?.focus(); } },
    { label: 'Focus', click: () => { mainWindow?.show(); mainWindow?.loadURL(`${APP_URL}/focus`); mainWindow?.focus(); } },
    { label: 'Journal', click: () => { mainWindow?.show(); mainWindow?.loadURL(`${APP_URL}/journal`); mainWindow?.focus(); } },
    { label: 'Notes', click: () => { mainWindow?.show(); mainWindow?.loadURL(`${APP_URL}/notes`); mainWindow?.focus(); } },
    { type: 'separator' },
    { label: 'Quit Chrononaut', accelerator: 'Command+Q', click: () => { app.isQuitting = true; app.quit(); } },
  ]);

  tray.setToolTip('Chrononaut');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (mainWindow?.isVisible()) mainWindow.focus();
    else { mainWindow?.show(); mainWindow?.focus(); }
  });
}

function createAppMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' }, { type: 'separator' }, { role: 'services' }, { type: 'separator' },
        { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' },
        { label: 'Quit', accelerator: 'Command+Q', click: () => { app.isQuitting = true; app.quit(); } },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' }, { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { type: 'separator' }, { role: 'front' }, { role: 'close' }],
    },
    {
      label: 'Navigate',
      submenu: [
        { label: 'Dashboard', accelerator: 'Command+1', click: () => mainWindow?.loadURL(`${APP_URL}/dashboard`) },
        { label: 'Focus', accelerator: 'Command+2', click: () => mainWindow?.loadURL(`${APP_URL}/focus`) },
        { label: 'Journal', accelerator: 'Command+3', click: () => mainWindow?.loadURL(`${APP_URL}/journal`) },
        { label: 'Notes', accelerator: 'Command+4', click: () => mainWindow?.loadURL(`${APP_URL}/notes`) },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    createTray();
    createAppMenu();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
      else { mainWindow?.show(); mainWindow?.focus(); }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  app.isQuitting = true;
});
