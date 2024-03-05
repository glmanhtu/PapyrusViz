const path = require('node:path');
const fs = require('fs');
const { Menu } = require('electron')
const dialogUtils = require('../utils/dialog.utils');
const pathUtils = require('../utils/path.utils');
const { event } = require('jquery');

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

        ipcMain.on('main:img-context-menu', (event, args) => {
          const imageId = args['imageId'];
          const matching = args['matching'];
          const template = [
            {
              label: 'To Front',
              click: () => { event.reply('main:menu:img-to-front', args) }
            },
            {
              label: 'To Back',
              click: () => { event.reply('main:menu:img-to-back', args) }
            },
            { type: 'separator' },
            {
              label: 'Delete',
              accelerator: 'Backspace',
              click: () => { event.reply('main:menu:img-delete', args) }
            },
            { type: 'separator' },
            { 
              label: 'Find similarities', 
              accelerator: 'CmdOrCtrl+F',
              enabled: matching !== undefined,
              click: () => {event.reply('main:menu:img-find-similarity', args)}
            }
          ]
          const menu = Menu.buildFromTemplate(template)
          menu.popup({ window: mainWin })
        });

        ipcMain.on('main:open-create-similarity', async (event, projPath) => {
          const dlg = dialogUtils.openDialog(pathUtils.fromRoot('modules', 'main', 'dialogs', 'similarity', 'index.html'), this.mainWin, 800, 600, projPath);
        });
    }

}

exports.MainController = MainController;