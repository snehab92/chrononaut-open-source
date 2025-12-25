import Store from 'electron-store';
import { BrowserWindow } from 'electron';

interface WindowStateData {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized: boolean;
}

const store = new Store<{ windowState: WindowStateData }>({
  defaults: {
    windowState: {
      width: 1400,
      height: 900,
      isMaximized: false,
    },
  },
});

export function loadWindowState(): WindowStateData {
  return store.get('windowState');
}

export function saveWindowState(window: BrowserWindow): void {
  if (!window.isMaximized() && !window.isMinimized()) {
    const bounds = window.getBounds();
    store.set('windowState', {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized: window.isMaximized(),
    });
  }
}
