const fs = require('fs');
const sharp = require('sharp');
const path = require('node:path');
const dialogUtils = require('../utils/dialog.utils');
const pathUtils = require('../utils/path.utils')

class ProjectController {
    constructor(ipcMain, mainWin) {
        this.ipcMain = ipcMain
        this.mainWin = mainWin
        
        ipcMain.on('proj:create-project', this.createProject);

        ipcMain.on('proj:open-create-project', async (event) => {
            dialogUtils.openDialog(pathUtils.fromRoot('modules', 'project', 'main.html'), this.mainWin)
        });
    }
    

    async createProject(event, args) {
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
    }
}

exports.ProjectController = ProjectController;