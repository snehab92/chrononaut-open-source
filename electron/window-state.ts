import { app, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

interface WindowStateData {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized: boolean;
}

const defaultState: WindowStateData = {
  width: 1400,
  height: 900,
  isMaximized: false,
};

function getStatePath(): string {
  return path.join(app.getPath('userData'), 'window-state.json');
}

export function loadWindowState(): WindowStateData {
  try {
    const statePath = getStatePath();
    if (fs.existsSync(statePath)) {
      const data = fs.readFileSync(statePath, 'utf-8');
      return { ...defaultState, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error('Failed to load window state:', error);
  }
  return defaultState;
}

export function saveWindowState(window: BrowserWindow): void {
  if (!window.isMaximized() && !window.isMinimized()) {
    try {
      const bounds = window.getBounds();
      const state: WindowStateData = {
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        isMaximized: window.isMaximized(),
      };
      fs.writeFileSync(getStatePath(), JSON.stringify(state, null, 2));
    } catch (error) {
      console.error('Failed to save window state:', error);
    }
  }
}
