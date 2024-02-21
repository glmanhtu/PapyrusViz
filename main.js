const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron');
const path = require('node:path')

const currentProject = null;

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

  win.loadFile('index.html');

  win.on('resize', function () {
      var size   = win.getSize();
      win.webContents.send('resized', size);
  });

  const child = new BrowserWindow({ parent: win, modal: true, show: false })
  child.loadFile(path.join('dialogs', 'welcome', 'main.html'))
  child.once('ready-to-show', () => {
    child.show()
  })
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on('get-current-project', async (event) => {
  event.reply('current-project', currentProject)
});

ipcMain.on('open-file-dialog', async (event) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif'] }]
  });

  if (!result.canceled) {
    event.reply('selected-files', result.filePaths);
  }
});
