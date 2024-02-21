const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron');
const path = require('node:path')

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
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
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
