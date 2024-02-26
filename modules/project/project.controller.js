const fs = require('fs');
const sharp = require('sharp');
const path = require('node:path');
const { v4: uuidv4 } = require('uuid');
const dialogUtils = require('../utils/dialog.utils');
const pathUtils = require('../utils/path.utils')

class ProjectController {
    constructor(ipcMain, mainWin) {
        this.ipcMain = ipcMain;
        this.mainWin = mainWin;
        this.project = {};
        
        ipcMain.on('proj:create-project', this.createProject);

        ipcMain.on('proj:open-project', this.openProject);

        ipcMain.on('proj:open-create-project', async (event) => {
            dialogUtils.openDialog(pathUtils.fromRoot('modules', 'project', 'dialogs', 'create', 'index.html'), this.mainWin)
        });

        ipcMain.on('proj:open-welcome-dialog', async (event) => {
            dialogUtils.openDialog(pathUtils.fromRoot('modules', 'project', 'index.html'), this.mainWin)
        });

        ipcMain.handle('proj:get-current-project', this.getCurrentProject);
    }

    async getCurrentProject(event, args) {
        return this.project;
    }
    
    async openProject(event, args) {
        const projLocation = args['projPath'];
        if (!self.projectExists(projLocation)) {
            return dialogUtils.errorDialog(this.mainWin, 'Unnable to open project', `There is no project in the selected folder!`);
        }
        this.project = JSON.parse(fs.readFileSync('file', 'utf8'));
        dialogUtils.closeCurrentDialog();
        this.ipcMain.emit('main:reload', this.project);
    }

    projectExists(projLocation) {
        const isProjPathExists = fs.existsSync(projLocation) && fs.lstatSync(projLocation).isDirectory();
        if (isProjPathExists) {
            if (fs.lstatSync(path.join(projLocation, 'project.json')).isFile()) {
                return true;
            }
        }
        return false;
    }

    async createProject(event, args) {
        const projLocation = args['projPath'];
        const datasetLocation = args['datasetPath'];
        const projectData = {...args};

        // Parameter validation
        const isProjPathExists = fs.existsSync(projLocation) && fs.lstatSync(projLocation).isDirectory();
        const isDatasetPathExists = fs.existsSync(datasetLocation) && fs.lstatSync(datasetLocation).isDirectory();
        if (!isDatasetPathExists) {
            return dialogUtils.errorDialog(this.mainWin, 'Unnable to create new project', `Dataset location: ${datasetLocation} doesn't exists!`);
        }
        if (isProjPathExists && fs.readdirSync(projLocation).length !== 0) {
            return dialogUtils.errorDialog(this.mainWin, 'Unnable to create new project', `Project location: ${projLocation} is not empty!`);
        }

        // Step 1: Create project files
        event.reply('proj:starting');
        event.reply('proj:progress', {'name': "Step 1/3 - Creating project...", 'desc': "Writing project files...", 'current': 0});
        if (!isProjPathExists) {
            fs.mkdirSync(projLocation);
        }
        fs.writeFileSync(path.join(projLocation, 'project.json'), JSON.stringify(projectData));
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

        projectData.images = {}

        // Step 3: Generate image thumbnails
        fs.mkdirSync(path.join(projLocation, 'thumbnails')); 
        for (let i = 0; i < images.length; i++) {
            const thumbnailPath = path.join(projLocation, 'thumbnails', `${i}.jpg`)
            const image = sharp(images[i]);
            await image
            .resize({height: 200})
            .toFile(thumbnailPath);
            const metadata = await image.metadata();

            const per = (i + 1) * 90 / images.length;
            event.reply('proj:progress', {'name': "Step 3/3 - Generating thumbnails...", 'desc': `Generated ${i + 1}/${images.length} thumbnails images...`, 'current': 15 + per});
            const imageId = uuidv4();
            projectData.images[imageId] = {
                'path': images[i],
                'thumbnails': thumbnailPath,
                'width': metadata.width,
                'height': metadata.height,
                'format': metadata.format,
                'size': metadata.size,
            };
        }

        // Finished
        fs.writeFileSync(path.join(projLocation, 'project.json'), JSON.stringify(projectData));
        event.reply('proj:finished');
    }
}

exports.ProjectController = ProjectController;