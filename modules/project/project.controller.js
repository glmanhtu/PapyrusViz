const fs = require('fs');
const sharp = require('sharp');
const path = require('node:path');
// const { v4: uuidv4 } = require('uuid');
const dialogUtils = require('../utils/dialog.utils');
const pathUtils = require('../utils/path.utils')
const dataUtils = require('../utils/data.utils')

class ProjectController {
    constructor(ipcMain, mainWin) {
        this.ipcMain = ipcMain;
        this.mainWin = mainWin;
        
        ipcMain.on('proj:create-project', this.createProject.bind(this));

        ipcMain.on('proj:open-project', this.openProject.bind(this));

        ipcMain.on('proj:open-create-project', async (event) => {
            dialogUtils.openDialog(pathUtils.fromRoot('modules', 'project', 'dialogs', 'create', 'index.html'), this.mainWin)
        });

        ipcMain.on('proj:open-welcome-dialog', async (event) => {
            dialogUtils.openDialog(pathUtils.fromRoot('modules', 'project', 'index.html'), this.mainWin)
        });

        ipcMain.handle('proj:get-projects', this.getProjects.bind(this));
        ipcMain.handle('proj:get-project', this.getProject.bind(this));
        ipcMain.handle('proj:save-project', this.saveProject.bind(this));
        ipcMain.handle('proj:del-project', this.delProject.bind(this));
    }
    
    async saveProject(event, args) {
        const projLocation = args['projPath'];
        if (!this.projectExists(projLocation)) {
            dialogUtils.errorDialog(this.mainWin, 'Unnable to save project', `There is no project in the selected folder!`);
            return false;
        }
        const project = args['project'];
        fs.writeFileSync(path.join(projLocation, 'project.json'), JSON.stringify(project)); 
        return true;
    }

    async getProject(event, args) {
        const projLocation = args['projPath'];
        if (!this.projectExists(projLocation)) {
            return dialogUtils.errorDialog(this.mainWin, 'Unnable to open project', `There is no project in the selected folder!`);
        }
        return JSON.parse(fs.readFileSync(path.join(projLocation, 'project.json'), 'utf-8'));
    }

    async getProjects(event, args) {
        const appData = dataUtils.readAppData();
        return appData.projects;
    }
    
    async openProject(event, args) {
        const projLocation = args['projPath'];
        if (!this.projectExists(projLocation)) {
            return dialogUtils.errorDialog(this.mainWin, 'Unnable to open project', `There is no project in the selected folder!`);
        }
        dialogUtils.closeCurrentDialog();
        this.ipcMain.emit('main:reload', projLocation);
    }


    async delProject(event, args) {
        const projLocation = args['projPath'];
        if (this.projectExists(projLocation)) {
            if (dialogUtils.confirmDialog(dialogUtils.getCurrentDialog() || this.mainWin, 'Confirmation', 'Are you sure ? This can not be undone!')) {
                const appData = dataUtils.readAppData();
                appData.projects = appData.projects.filter(item => item.projPath !== projLocation);
                dataUtils.writeAppData(appData);
                fs.rmSync(projLocation, { recursive: true, force: true });
                return true;
            }
            return false;
        }
        return true;
    }

    addProject(projectData) {
        const appData = dataUtils.readAppData();
        appData.projects.push(projectData)
        dataUtils.writeAppData(appData);
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
        projectData.images = {}
        projectData.createdAt = Date.now();
        projectData.assembled = { 
            0: {'name': 'Assembling #1', 'activated': true, 'images': {}, 'imagesCount': 0, 'createdAt': Date.now()},
        };
        projectData.assembledCount = 1;


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
            projectData.images[i] = {
                'path': images[i],
                'thumbnails': thumbnailPath,
                'width': metadata.width,
                'height': metadata.height,
                'format': metadata.format,
                'size': metadata.size,
            };
        }
        projectData.imagesCount = images.length;

        // Finished
        fs.writeFileSync(path.join(projLocation, 'project.json'), JSON.stringify(projectData));
        this.addProject(args);
        event.reply('proj:finished');
    }
}

exports.ProjectController = ProjectController;