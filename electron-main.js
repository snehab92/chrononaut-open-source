// Simple electron test
const { app, BrowserWindow } = require('electron');

console.log('App:', app);

if (!app) {
  console.error('Electron app is undefined!');
  process.exit(1);
}

app.whenReady().then(() => {
  console.log('App ready!');
  const win = new BrowserWindow({ width: 800, height: 600 });
  win.loadURL('https://google.com');
});
