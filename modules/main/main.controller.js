const path = require('node:path');
const fs = require('fs');
const { Menu } = require('electron')
const dialogUtils = require('../utils/dialog.utils');
const pathUtils = require('../utils/path.utils')

const isMac = process.platform === 'darwin'


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

        ipcMain.on('main:img-context-menu', (event) => {
          const template = [
            {
              label: 'To Front',
              click: () => { event.sender.send('main:menu:img-to-front') }
            },
            {
              label: 'To Back',
              click: () => { event.sender.send('main:menu:img-to-back') }
            },
            { type: 'separator' },
            {
              label: 'Delete',
              accelerator: 'Backspace',
              click: () => { event.sender.send('main:menu:img-delete') }
            },
            { type: 'separator' },
            { label: 'Find similarities', accelerator: 'CmdOrCtrl+F'}
          ]
          const menu = Menu.buildFromTemplate(template)
          menu.popup({ window: mainWin })
        });
    }

}

exports.MainController = MainController;