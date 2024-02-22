const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron');
const path = require('node:path')
const fs = require('fs');


const currentProject = null;
let currentDlg = null;
let win = null;

function createWindow() {
  win = new BrowserWindow({
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
  ipcMain.emit('open-welcome-dialog');
}

function openDialog(dialogPath, width=800, height=600) {
    if (currentDlg) {
        currentDlg.close();
        currentDlg = null;
    }

    currentDlg = new BrowserWindow({ 
            parent: win, 
            modal: true, 
            show: false,  
            width: width,
            height: height,
            transparent: true,
            autoHideMenuBar: true,
            closable: false,
            frame: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            }
        })
    currentDlg.loadFile(dialogPath);
    currentDlg.once('ready-to-show', () => {
        currentDlg.show();
    });
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

ipcMain.on('open-message-dialog', async (event, args) => {

});

ipcMain.on('open-welcome-dialog', async (event) => {
    openDialog(path.join('dialogs', 'welcome', 'main.html'))
});

ipcMain.on('open-create-project', async (event) => {
    openDialog(path.join('dialogs', 'project', 'main.html'), 800, 460)
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

ipcMain.on('open-dir-dialog', async (event, args) => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });

  if (!result.canceled) {
    event.reply('selected-dir', [result.filePaths, args]);
  }
});