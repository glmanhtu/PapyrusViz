const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron');
const path = require('node:path')
const fs = require('fs');
const sharp = require('sharp');


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
            frame: false,
            // useContentSize: true,
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

function errorDialog(title, content) {
  dialog.showMessageBoxSync(win, {
    type: 'error',
    buttons: ['Close'],
    defaultId: 0,
    title: 'Error',
    message: title,
    detail: content
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


ipcMain.handle('open-message-dialog', async (event, args) => {
    return dialog.showMessageBoxSync(win, args);
});

ipcMain.on('proj:create-project', async (event, args) => {
  const projName = args['projName'];
  const projLocation = args['projPath'];
  const datasetLocation = args['datasetPath'];

  // Parameter validation
  const isProjPathExists = fs.existsSync(projLocation) && fs.lstatSync(projLocation).isDirectory();
  const isDatasetPathExists = fs.existsSync(datasetLocation) && fs.lstatSync(datasetLocation).isDirectory();
  if (!isDatasetPathExists) {
    return errorDialog('Unnable to create new project', `Dataset location: ${datasetLocation} doesn't exists!`);
  }
  if (isProjPathExists && fs.readdirSync(projLocation).length !== 0) {
    return errorDialog('Unnable to create new project', `Project location: ${projLocation} is not empty!`);
  }

  // Step 1: Create project files
  event.reply('proj:starting');
  event.reply('proj:progress', {'name': "Step 1/3 - Creating project...", 'desc': "Writing project files...", 'current': 0});
  if (!isProjPathExists) {
    fs.mkdirSync(projLocation);
  }
  fs.writeFileSync(path.join(projLocation, 'project.json'), JSON.stringify(args));
  event.reply('proj:progress', {'name': "Step 1/3 - Creating project...", 'desc': "Writing project files...", 'current': 5});

  // Step 2: Get image files
  const images = [];
  const getFilesRecursively = (directory, level=0) => {
    const filesInDirectory = fs.readdirSync(directory);
    for (let i = 0; i < filesInDirectory.length; i++) {
      const absolute = path.join(directory, filesInDirectory[i]);
      if (fs.statSync(absolute).isDirectory()) {
          getFilesRecursively(absolute, level + 1);
      } else {
        const fileExt = absolute.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png'].includes(fileExt)) {
          images.push(absolute);
        }
      }
      if (level === 0) {
        const per = (i + 1) * 10 / filesInDirectory.length;
        event.reply('proj:progress', {'name': "Step 2/3 - Collecting images...", 'desc': `Collected ${images.length} images...`, 'current': 5 + per});
      }
    }
  };

  getFilesRecursively(datasetLocation);

  // Step 3: Generate image thumbnails
  fs.mkdirSync(path.join(projLocation, 'thumbnails')); 
  for (let i = 0; i < images.length; i++) {
    await sharp(images[i])
      .resize({height: 200})
      .toFile(path.join(projLocation, 'thumbnails', `${i}.jpg`));
    const per = (i + 1) * 90 / images.length;
    event.reply('proj:progress', {'name': "Step 3/3 - Generating thumbnails...", 'desc': `Generated ${i + 1}/${images.length} thumbnails images...`, 'current': 15 + per});
  }

  // Finished
  event.reply('proj:finished');
});

ipcMain.on('open-welcome-dialog', async (event) => {
    openDialog(path.join('dialogs', 'welcome', 'main.html'))
});

ipcMain.on('open-create-project', async (event) => {
    openDialog(path.join('dialogs', 'project', 'main.html'), 800, 480)
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