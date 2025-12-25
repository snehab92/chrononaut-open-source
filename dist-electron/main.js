"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Use require for Electron to ensure proper module loading
const electron = require('electron');
const { app, BrowserWindow, shell, Tray, Menu, nativeImage } = electron;
const path_1 = __importDefault(require("path"));
const window_state_1 = require("./window-state");
// Keep references to prevent garbage collection
let mainWindow = null;
let tray = null;
// Detect development mode
const isDev = process.env.ELECTRON_IS_DEV === '1' ||
    process.defaultApp ||
    /node_modules[\\/]electron[\\/]/.test(process.execPath);
// App URL - uses Vercel deployment in production, localhost in dev
const APP_URL = isDev
    ? 'http://localhost:3000'
    : 'https://chrononaut.vercel.app';
function createWindow() {
    const windowState = (0, window_state_1.loadWindowState)();
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
            preload: path_1.default.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true,
        },
        show: false,
    });
    // Load the app
    mainWindow.loadURL(APP_URL);
    // Open DevTools in development
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }
    // Show window when ready to prevent flicker
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
        mainWindow?.focus();
    });
    // Save window state on move/resize
    mainWindow.on('resize', () => {
        if (mainWindow)
            (0, window_state_1.saveWindowState)(mainWindow);
    });
    mainWindow.on('move', () => {
        if (mainWindow)
            (0, window_state_1.saveWindowState)(mainWindow);
    });
    // Hide to tray instead of quit on window close
    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow?.hide();
        }
    });
    // Handle external links - open OAuth in browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        // OAuth flows open in default browser
        if (url.includes('accounts.google.com') ||
            url.includes('api.ticktick.com') ||
            url.includes('api.prod.whoop.com')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        // Other external links open in browser
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
function createTray() {
    // Use template image for macOS menu bar (automatically handles dark/light mode)
    const iconPath = isDev
        ? path_1.default.join(__dirname, '../public/icons/tray-iconTemplate.png')
        : path_1.default.join(process.resourcesPath, 'icons/tray-iconTemplate.png');
    let trayIcon;
    try {
        trayIcon = nativeImage.createFromPath(iconPath);
        // Resize for menu bar (16x16 is standard)
        trayIcon = trayIcon.resize({ width: 16, height: 16 });
    }
    catch {
        // Fallback: create a simple icon if file doesn't exist
        trayIcon = nativeImage.createEmpty();
    }
    tray = new Tray(trayIcon);
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open Chrononaut',
            click: () => {
                mainWindow?.show();
                mainWindow?.focus();
            },
        },
        { type: 'separator' },
        {
            label: 'Dashboard',
            click: () => {
                mainWindow?.show();
                mainWindow?.loadURL(`${APP_URL}/dashboard`);
                mainWindow?.focus();
            },
        },
        {
            label: 'Focus',
            click: () => {
                mainWindow?.show();
                mainWindow?.loadURL(`${APP_URL}/focus`);
                mainWindow?.focus();
            },
        },
        {
            label: 'Journal',
            click: () => {
                mainWindow?.show();
                mainWindow?.loadURL(`${APP_URL}/journal`);
                mainWindow?.focus();
            },
        },
        {
            label: 'Notes',
            click: () => {
                mainWindow?.show();
                mainWindow?.loadURL(`${APP_URL}/notes`);
                mainWindow?.focus();
            },
        },
        { type: 'separator' },
        {
            label: 'Quit Chrononaut',
            accelerator: 'Command+Q',
            click: () => {
                app.isQuitting = true;
                app.quit();
            },
        },
    ]);
    tray.setToolTip('Chrononaut');
    tray.setContextMenu(contextMenu);
    // Click on tray icon opens the app
    tray.on('click', () => {
        if (mainWindow?.isVisible()) {
            mainWindow.focus();
        }
        else {
            mainWindow?.show();
            mainWindow?.focus();
        }
    });
}
function createAppMenu() {
    const template = [
        {
            label: app.name,
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                {
                    label: 'Quit',
                    accelerator: 'Command+Q',
                    click: () => {
                        app.isQuitting = true;
                        app.quit();
                    }
                },
            ],
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'pasteAndMatchStyle' },
                { role: 'delete' },
                { role: 'selectAll' },
            ],
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' },
            ],
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                { type: 'separator' },
                { role: 'front' },
                { role: 'close' },
            ],
        },
        {
            label: 'Navigate',
            submenu: [
                {
                    label: 'Dashboard',
                    accelerator: 'Command+1',
                    click: () => mainWindow?.loadURL(`${APP_URL}/dashboard`),
                },
                {
                    label: 'Focus',
                    accelerator: 'Command+2',
                    click: () => mainWindow?.loadURL(`${APP_URL}/focus`),
                },
                {
                    label: 'Journal',
                    accelerator: 'Command+3',
                    click: () => mainWindow?.loadURL(`${APP_URL}/journal`),
                },
                {
                    label: 'Notes',
                    accelerator: 'Command+4',
                    click: () => mainWindow?.loadURL(`${APP_URL}/notes`),
                },
            ],
        },
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}
// Single instance lock - prevent multiple windows
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
}
else {
    app.on('second-instance', () => {
        // Someone tried to run a second instance, focus our window
        if (mainWindow) {
            if (mainWindow.isMinimized())
                mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });
    app.whenReady().then(() => {
        createWindow();
        createTray();
        createAppMenu();
        app.on('activate', () => {
            // On macOS, re-create window when dock icon is clicked
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
            else {
                mainWindow?.show();
                mainWindow?.focus();
            }
        });
    });
}
// Keep app running when all windows are closed (macOS behavior)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
app.on('before-quit', () => {
    app.isQuitting = true;
});
//# sourceMappingURL=main.js.map