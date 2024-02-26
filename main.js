const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron');
const path = require('node:path')
const {ProjectController} = require('./modules/project/project.controller');
const {DialogsController} = require('./modules/dialogs/dialogs.controller');
const {MainController} = require('./modules/main/main.controller');


function createWindow() {
  const win = new BrowserWindow({
    width: 1500,
    height: 1000,
    // autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  win.on('resize', function () {
      var size   = win.getSize();
      win.webContents.send('resized', size);
  });


  const controllers = [
    new MainController(ipcMain, win),
    new DialogsController(ipcMain, win),
    new ProjectController(ipcMain, win),
  ]

  ipcMain.emit('proj:open-welcome-dialog');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});


