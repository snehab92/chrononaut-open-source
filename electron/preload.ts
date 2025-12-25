import { contextBridge, ipcRenderer } from 'electron';

// Expose a minimal API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform detection
  platform: process.platform,
  isElectron: true,

  // App info
  getAppVersion: () => ipcRenderer.invoke('app:version'),
});

// Type definitions for the renderer process
declare global {
  interface Window {
    electronAPI?: {
      platform: NodeJS.Platform;
      isElectron: boolean;
      getAppVersion: () => Promise<string>;
    };
  }
}
