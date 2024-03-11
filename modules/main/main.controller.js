const path = require('node:path');
const fs = require('fs');
const sharp = require('sharp');
const { Menu, dialog } = require('electron')
const dialogUtils = require('../utils/dialog.utils');
const pathUtils = require('../utils/path.utils');
const dataUtils = require('../utils/data.utils');

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
          const project = args['project'];
          const activeAssemblingId = parseInt(args['activeAssemblingId']);
          const activeAssembling = project.assembled[activeAssemblingId];
          
          const { filePath, canceled } = await dialog.showSaveDialog({
            defaultPath: activeAssembling.name + ".png"
          });
        
          if (!filePath || canceled) {
            return;
          }

          const images = [];
          for (const [imgId, imageTransforms] of Object.entries(activeAssembling.images)) {
            const image = project.images[parseInt(imgId)];
            const zIndex = imageTransforms['zIndex'];
            const rotation = imageTransforms['rotation'] || 0;
            const scale = imageTransforms['scale'] || 1;
            const width = Math.round(scale * image.width);
            const height = Math.round(scale * image.height);
            const top = imageTransforms['top'];
            const left = imageTransforms['left'];
            let processedImage = await sharp(image.path, {
                  raw: {
                    width: image.width,
                    height: image.height,
                    channels: 4
                  },
                })
                .resize({ width: width, height: height })
                .toBuffer();
              
            const metaData1 = await sharp(processedImage).metadata();
            const widthBeforeRotate = metaData1.width;
            
            processedImage = await sharp(processedImage)
              .rotate(rotation, {background: { r: 0, g: 0, b: 0, alpha: 0 }})
              .toBuffer();

            const metaData = await sharp(processedImage).metadata();

            const wChange = (metaData.width - widthBeforeRotate) / 2;
            
            images.push({img: processedImage, zIndex: zIndex, top: top, left: parseInt(left - wChange), width: metaData.width, height: metaData.height});
            mainWin.setProgressBar(images.length / activeAssembling.images.length)
          }

          const minX = Math.min(...dataUtils.getItemList(images, (x) => x.left));
          const maxX = Math.max(...dataUtils.getItemList(images, (x) => x.left + x.width - minX));
          
          const minY = Math.min(...dataUtils.getItemList(images, (x) => x.top));
          const maxY = Math.max(...dataUtils.getItemList(images, (x) => x.top + x.height - minY));
          
          const fragments = images.sort((a, b) => a.zIndex - b.zIndex);
          const composites = [];
          fragments.forEach(element => {
            composites.push({
              input: element.img,
              top: element.top - minY,
              left: element.left - minX
            });
          });


          await sharp({
            create: {
              width: maxX,
              height: maxY,
              channels: 4,
              background: { r: 255, g: 255, b: 255, alpha: 1 }
            }})
            .composite(composites)
            .toFile(filePath);

          mainWin.setProgressBar(-1)
        });

        ipcMain.on('main:tab-context-menu', (event, args) => {
          const template = [
            {
              label: 'Rename',
              click: () => { 
                event.reply('main:menu:tab-rename', args) 
              }
            }
          ]
          const menu = Menu.buildFromTemplate(template)
          menu.popup({ window: mainWin })
        });

        ipcMain.on('main:img-context-menu', (event, args) => {
          const imageId = args['imageId'];
          const matching = args['matching'];
          const switchVersions = args['switchVersions'];
          const subMenuVersion = [];
          switchVersions.forEach(element => {
            subMenuVersion.push({
              'label': element['name'],
              click: () => {event.reply('main:menu:switch-image', {'imageId': imageId, 'toImage': element['imgId']})}
            })
          });
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
            },
            {
              label: 'Switch version',
              enabled: switchVersions.length > 0,
              submenu: subMenuVersion
            }
          ]
          const menu = Menu.buildFromTemplate(template)
          menu.popup({ window: mainWin })
        });

        ipcMain.on('main:open-create-similarity', async (event, projPath) => {
          const dlg = dialogUtils.openDialog(pathUtils.fromRoot('modules', 'main', 'dialogs', 'similarity', 'index.html'), this.mainWin, 800, 600, projPath);
        });

        ipcMain.on('main:quit', async (event, args) => {
          dialogUtils.closeCurrentDialog();
          mainWin.close();
        });
    }

}

exports.MainController = MainController;