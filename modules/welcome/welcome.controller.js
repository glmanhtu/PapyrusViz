const path = require('node:path');
const dialogUtils = require('../utils/dialog.utils');
const pathUtils = require('../utils/path.utils')

class WelcomeController {
    constructor(ipcMain, mainWin) {
        this.ipcMain = ipcMain
        this.mainWin = mainWin
        
        this.ipcMain.on('welcome:open-welcome-dialog', async (event) => {
            dialogUtils.openDialog(pathUtils.fromRoot('modules', 'welcome', 'main.html'), this.mainWin)
        });
    }

}

exports.WelcomeController = WelcomeController;