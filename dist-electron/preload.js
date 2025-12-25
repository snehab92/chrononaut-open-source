"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose a minimal API to the renderer process
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // Platform detection
    platform: process.platform,
    isElectron: true,
    // App info
    getAppVersion: () => electron_1.ipcRenderer.invoke('app:version'),
});
//# sourceMappingURL=preload.js.map