"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const window_state_1 = require("./window-state");
// Keep references to prevent garbage collection
let mainWindow = null;
let tray = null;
// Detect development mode
const isDev = !electron_1.app.isPackaged;
// App URL - uses Vercel deployment in production, localhost in dev
const APP_URL = isDev
    ? 'http://localhost:3000'
    : 'https://chrononaut-psi.vercel.app';
function createWindow() {
    const windowState = (0, window_state_1.loadWindowState)();
    mainWindow = new electron_1.BrowserWindow({
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
            preload: path_1.default.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true,
        },
        show: false,
    });
    mainWindow.loadURL(`${APP_URL}/dashboard`);
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
        mainWindow?.focus();
    });
    mainWindow.on('resize', () => {
        if (mainWindow)
            (0, window_state_1.saveWindowState)(mainWindow);
    });
    mainWindow.on('move', () => {
        if (mainWindow)
            (0, window_state_1.saveWindowState)(mainWindow);
    });
    mainWindow.on('close', (event) => {
        if (!electron_1.app.isQuitting) {
            event.preventDefault();
            mainWindow?.hide();
        }
    });
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.includes('accounts.google.com') ||
            url.includes('api.ticktick.com') ||
            url.includes('api.prod.whoop.com')) {
            electron_1.shell.openExternal(url);
            return { action: 'deny' };
        }
        if (!url.startsWith(APP_URL) && !url.startsWith('http://localhost')) {
            electron_1.shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
function createTray() {
    const iconPath = isDev
        ? path_1.default.join(__dirname, '../public/icons/tray-iconTemplate.png')
        : path_1.default.join(process.resourcesPath, 'icons/tray-iconTemplate.png');
    let trayIcon;
    try {
        trayIcon = electron_1.nativeImage.createFromPath(iconPath);
        trayIcon = trayIcon.resize({ width: 16, height: 16 });
    }
    catch {
        trayIcon = electron_1.nativeImage.createEmpty();
    }
    tray = new electron_1.Tray(trayIcon);
    const contextMenu = electron_1.Menu.buildFromTemplate([
        { label: 'Open Chrononaut', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
        { type: 'separator' },
        { label: 'Dashboard', click: () => { mainWindow?.show(); mainWindow?.loadURL(`${APP_URL}/dashboard`); mainWindow?.focus(); } },
        { label: 'Focus', click: () => { mainWindow?.show(); mainWindow?.loadURL(`${APP_URL}/focus`); mainWindow?.focus(); } },
        { label: 'Journal', click: () => { mainWindow?.show(); mainWindow?.loadURL(`${APP_URL}/journal`); mainWindow?.focus(); } },
        { label: 'Notes', click: () => { mainWindow?.show(); mainWindow?.loadURL(`${APP_URL}/notes`); mainWindow?.focus(); } },
        { type: 'separator' },
        { label: 'Quit Chrononaut', accelerator: 'Command+Q', click: () => { electron_1.app.isQuitting = true; electron_1.app.quit(); } },
    ]);
    tray.setToolTip('Chrononaut');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
        if (mainWindow?.isVisible())
            mainWindow.focus();
        else {
            mainWindow?.show();
            mainWindow?.focus();
        }
    });
}
function createAppMenu() {
    const template = [
        {
            label: electron_1.app.name,
            submenu: [
                { role: 'about' }, { type: 'separator' }, { role: 'services' }, { type: 'separator' },
                { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' },
                { label: 'Quit', accelerator: 'Command+Q', click: () => { electron_1.app.isQuitting = true; electron_1.app.quit(); } },
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
    electron_1.Menu.setApplicationMenu(electron_1.Menu.buildFromTemplate(template));
}
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized())
                mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });
    electron_1.app.whenReady().then(() => {
        createWindow();
        createTray();
        createAppMenu();
        electron_1.app.on('activate', () => {
            if (electron_1.BrowserWindow.getAllWindows().length === 0)
                createWindow();
            else {
                mainWindow?.show();
                mainWindow?.focus();
            }
        });
    });
}
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
electron_1.app.on('before-quit', () => {
    electron_1.app.isQuitting = true;
});
//# sourceMappingURL=main.js.map