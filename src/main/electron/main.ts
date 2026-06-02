import { app, BrowserWindow, Menu } from 'electron';
import * as path from 'path';

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');

let mainWindow: BrowserWindow | null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../../preload/electron/preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const startUrl = `file://${path.join(__dirname, '../../renderer/pages/home/index.html')}`;

  mainWindow.loadURL(startUrl);

  Menu.setApplicationMenu(null);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
