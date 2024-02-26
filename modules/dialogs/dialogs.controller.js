const { dialog } = require('electron');
const path = require('node:path');
const dialogUtils = require('../utils/dialog.utils');
const pathUtils = require('../utils/path.utils')

class DialogsController {
    constructor(ipcMain, mainWin) {
        this.ipcMain = ipcMain
        this.mainWin = mainWin
        
        ipcMain.on('dialogs:open-images-dialog', async (event) => {
            const result = await dialog.showOpenDialog({
              properties: ['openFile', 'multiSelections'],
              filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png'] }]
            });
          
            if (!result.canceled) {
              event.reply('selected-files', result.filePaths);
            }
        });
          
        ipcMain.on('dialogs:open-dir-dialog', async (event, args) => {
            const result = await dialog.showOpenDialog({
                properties: ['openDirectory'],
            });
          
            if (!result.canceled) {
                event.reply('selected-dir', [result.filePaths, args]);
            }
        });
    }

}

exports.DialogsController = DialogsController;