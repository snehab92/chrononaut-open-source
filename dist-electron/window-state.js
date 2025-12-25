"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadWindowState = loadWindowState;
exports.saveWindowState = saveWindowState;
const electron_1 = require("electron");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const defaultState = {
    width: 1400,
    height: 900,
    isMaximized: false,
};
function getStatePath() {
    return path.join(electron_1.app.getPath('userData'), 'window-state.json');
}
function loadWindowState() {
    try {
        const statePath = getStatePath();
        if (fs.existsSync(statePath)) {
            const data = fs.readFileSync(statePath, 'utf-8');
            return { ...defaultState, ...JSON.parse(data) };
        }
    }
    catch (error) {
        console.error('Failed to load window state:', error);
    }
    return defaultState;
}
function saveWindowState(window) {
    if (!window.isMaximized() && !window.isMinimized()) {
        try {
            const bounds = window.getBounds();
            const state = {
                width: bounds.width,
                height: bounds.height,
                x: bounds.x,
                y: bounds.y,
                isMaximized: window.isMaximized(),
            };
            fs.writeFileSync(getStatePath(), JSON.stringify(state, null, 2));
        }
        catch (error) {
            console.error('Failed to save window state:', error);
        }
    }
}
//# sourceMappingURL=window-state.js.map