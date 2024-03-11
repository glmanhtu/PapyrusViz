const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron');
const path = require('node:path')
const {ProjectController} = require('./modules/project/project.controller');
const {DialogsController} = require('./modules/dialogs/dialogs.controller');
const {MainController} = require('./modules/main/main.controller');

const isMac = process.platform === 'darwin'


function createWindow() {
  const win = new BrowserWindow({
    width: 1350,
    height: 850,
    minWidth: 1350,
    minHeight: 850,
    // autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  const controllers = [
    new MainController(ipcMain, win),
    new DialogsController(ipcMain, win),
    new ProjectController(ipcMain, win),
  ]

  const menu = Menu.buildFromTemplate([
    ...(isMac
      ? [{
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
            { role: 'quit' }
          ]
        }]
      : []),
    {
      label: 'File',
      submenu: [
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'cut' },
        { role: 'copy' },
        { type: 'separator' },
        { 
          label: 'Save', 
          accelerator: 'CmdOrCtrl+S',
          click: () => {win.webContents.send('main:menu:save')}
        },
        {
          label: 'Delete',
          accelerator: 'Backspace',
          click: () => { win.webContents.send('main:menu:img-delete') }
        },
        { type: 'separator' },
        { 
          label: 'Find similarities', 
          accelerator: 'CmdOrCtrl+F',
          click: () => {win.webContents.send('main:menu:img-find-similarity')}
        },
      ]
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
        { role: 'togglefullscreen' }
      ]
    },
  ])
  Menu.setApplicationMenu(menu)

  ipcMain.emit('proj:open-welcome-dialog');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});


