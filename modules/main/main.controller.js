const path = require('node:path');
const dialogUtils = require('../utils/dialog.utils');
const pathUtils = require('../utils/path.utils')

class MainController {
    constructor(ipcMain, mainWin) {
        this.ipcMain = ipcMain
        this.mainWin = mainWin

        mainWin.loadFile(pathUtils.fromRoot('modules', 'main', 'index.html'));

        ipcMain.on('main:reload', (projPath) => {
            mainWin.webContents.postMessage('project-loaded', projPath);
        });
    }

}

exports.MainController = MainController;