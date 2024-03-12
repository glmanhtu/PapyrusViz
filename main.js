const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron');
const path = require('node:path')

// this should be placed at top of main.js to handle setup events quickly
if (handleSquirrelEvent()) {
  // squirrel event handled and app will exit in 1000ms, so don't do anything else
  return;
}

function handleSquirrelEvent() {
  if (process.argv.length === 1) {
    return false;
  }

  const ChildProcess = require('child_process');
  const path = require('path');

  const appFolder = path.resolve(process.execPath, '..');
  const rootAtomFolder = path.resolve(appFolder, '..');
  const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
  const exeName = path.basename(process.execPath);

  const spawn = function(command, args) {
    let spawnedProcess, error;

    try {
      spawnedProcess = ChildProcess.spawn(command, args, {detached: true});
    } catch (error) {}

    return spawnedProcess;
  };

  const spawnUpdate = function(args) {
    return spawn(updateDotExe, args);
  };

  const squirrelEvent = process.argv[1];
  switch (squirrelEvent) {
    case '--squirrel-install':
    case '--squirrel-updated':
      // Optionally do things such as:
      // - Add your .exe to the PATH
      // - Write to the registry for things like file associations and
      //   explorer context menus

      // Install desktop and start menu shortcuts
      spawnUpdate(['--createShortcut', exeName]);

      setTimeout(app.quit, 1000);
      return true;

    case '--squirrel-uninstall':
      // Undo anything you did in the --squirrel-install and
      // --squirrel-updated handlers

      // Remove desktop and start menu shortcuts
      spawnUpdate(['--removeShortcut', exeName]);

      setTimeout(app.quit, 1000);
      return true;

    case '--squirrel-obsolete':
      // This is called on the outgoing version of your app before
      // we update to the new version - it's the opposite of
      // --squirrel-updated

      app.quit();
      return true;
  }
};

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
  Menu.setApplicationMenu(menu);
  if (require('electron-squirrel-startup')) app.quit();

  ipcMain.emit('proj:open-welcome-dialog');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});


