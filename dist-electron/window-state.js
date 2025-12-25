"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadWindowState = loadWindowState;
exports.saveWindowState = saveWindowState;
const electron_store_1 = __importDefault(require("electron-store"));
const store = new electron_store_1.default({
    defaults: {
        windowState: {
            width: 1400,
            height: 900,
            isMaximized: false,
        },
    },
});
function loadWindowState() {
    return store.get('windowState');
}
function saveWindowState(window) {
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
//# sourceMappingURL=window-state.js.map