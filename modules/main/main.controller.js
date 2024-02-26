const path = require('node:path');
const dialogUtils = require('../utils/dialog.utils');
const pathUtils = require('../utils/path.utils')

class MainController {
    constructor(ipcMain, mainWin) {
        this.ipcMain = ipcMain
        this.mainWin = mainWin

        mainWin.loadFile(pathUtils.fromRoot('modules', 'main', 'index.html'));
        
        // mainWin.webContents.once('did-finish-load', (e) => {
            
        // });

        ipcMain.on('main:reload', (event, args) => {
            mainWin.reload();
        });
    }

}

exports.MainController = MainController;