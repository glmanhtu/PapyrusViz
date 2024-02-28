const path = require('node:path');
const fs = require('fs');
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

        ipcMain.on('main:export-img', async (event, args) => {
            mainWin.webContents.capturePage(args).then(data => {
                fs.writeFile('./print.png', data.toPNG(), (error) => {
                  if (error) throw error
                  console.log('Write PNG successfully.')
                })
              }).catch(error => {
                console.log(error)
              });
        });
    }

}

exports.MainController = MainController;