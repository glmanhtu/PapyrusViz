const fs = require('fs');
const sharp = require('sharp');
const path = require('node:path');
// const { v4: uuidv4 } = require('uuid');
const dialogUtils = require('../utils/dialog.utils');
const pathUtils = require('../utils/path.utils')
const dataUtils = require('../utils/data.utils');
const csv = require('@fast-csv/parse');


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

        ipcMain.on('proj:find-matching', async (event, args) => {
            const imageId = args['imageId'];
            const project = await this.getProject(event, args);
            const img = project.images[imageId];
            const result = { 'queryImg': imageId, 'matches': [] };
            const readStream = fs.createReadStream(project.matching.matchingFile)
            const isSimilarity = project.matching.matrixType === 'similarity';
            readStream
                .on('end', function () {
                    event.reply('main:matching:results', result);
                })
                .on('close', function (err) {
                    event.reply('main:matching:results', result);
                })
                .pipe(csv.parse({ headers: true }))
                .on("data", function (row) {
                    if (project.matching.matchingMethod === 'file') {
                        if (img.name.includes(row[''])) {
                            const matches = [];
                            for (const [fragId, distance] of Object.entries(row)) {
                                if (fragId === '') {
                                    continue;
                                }
                                for (const [targetImgId, targetImg] of Object.entries(project.images)) {
                                    if (targetImg.name.includes(fragId) && parseInt(targetImgId) !== imageId) {
                                        matches.push({ 'imgId': targetImgId, 'distance': parseFloat(distance) });
                                    }
                                }
                            }

                            result['matches'] = matches.sort((a, b) => {
                                if (isSimilarity) {
                                    return b['distance'] - a['distance'];
                                }
                                return a['distance'] - b['distance'];
                            });
                            readStream.destroy();
                        }
                    }
                });
        });

        ipcMain.on('proj:create-matching', async (event, args) => {
            const projPath = args['projPath'];
            const matchingName = args['matchingName'];
            const matchingFile = args['matchingFile'];
            const matchingMethod = args['matchingMethod'];
            const matrixType = args['matrixType'];
            const project = await this.getProject(event, args);
            project.matching = {
                'matchingName': matchingName,
                'matchingFile': matchingFile,
                'matrixType': matrixType,
                'matchingMethod': matchingMethod
            }
            await this.saveProject(event, { 'projPath': projPath, 'project': project });
            dialogUtils.closeCurrentDialog();
            this.ipcMain.emit('main:reload', projPath);
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
        const projectData = { ...args };
        projectData.images = {}
        projectData.createdAt = Date.now();
        projectData.assembled = {
            0: {
                'name': 'Assembling #1',
                'parent': 'default',
                'activated': true,
                'images': {},
                'imagesCount': 0,
                'createdAt': Date.now()
            },
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
        event.reply('proj:progress', { 'name': "Step 1/3 - Creating project...", 'desc': "Writing project files...", 'current': 0 });
        if (!isProjPathExists) {
            fs.mkdirSync(projLocation);
        }
        fs.writeFileSync(path.join(projLocation, 'project.json'), JSON.stringify(projectData));
        event.reply('proj:progress', { 'name': "Step 1/3 - Creating project...", 'desc': "Writing project files...", 'current': 5 });

        // Step 2: Get image files
        const images = [];
        const topLvSubdir = [];
        const getFilesRecursively = (directory, level = 0) => {
            const filesInDirectory = fs.readdirSync(directory);
            for (let i = 0; i < filesInDirectory.length; i++) {
                const absolute = path.join(directory, filesInDirectory[i]);
                if (fs.statSync(absolute).isDirectory()) {
                    if (level === 0) {
                        topLvSubdir.push({ 'name': filesInDirectory[i], 'path': absolute });
                    }
                    getFilesRecursively(absolute, level + 1);
                } else {
                    const fileExt = absolute.split('.').pop().toLowerCase();
                    if (['jpg', 'jpeg', 'png'].includes(fileExt)) {
                        images.push(absolute);
                    }
                }
                event.reply('proj:progress', { 'name': "Step 2/3 - Collecting images...", 'desc': `Collected ${images.length} images...`, 'current': 10 });
            }
        };

        getFilesRecursively(datasetLocation);
        topLvSubdir.push({ 'name': 'All Images', 'path': '' });
        projectData.rootDirs = { 'available': topLvSubdir, 'selected': null };

        // Step 3: Generate image thumbnails
        fs.mkdirSync(path.join(projLocation, 'thumbnails'));
        for (let i = 0; i < images.length; i++) {
            const thumbnailPath = path.join(projLocation, 'thumbnails', `${i}.jpg`)
            const image = sharp(images[i]);
            try {
                await image
                    .resize({ height: 200 })
                    .flatten({ background: { r: 255, g: 255, b: 255 } })
                    .toFile(thumbnailPath);
                const metadata = await image.metadata();

                const per = (i + 1) * 90 / images.length;
                event.reply('proj:progress', { 'name': "Step 3/3 - Generating thumbnails...", 'desc': `Generated ${i + 1}/${images.length} thumbnails images...`, 'current': 15 + per });
                projectData.images[i] = {
                    'path': images[i],
                    'name': path.basename(images[i]),
                    'thumbnails': thumbnailPath,
                    'width': metadata.width,
                    'height': metadata.height,
                    'format': metadata.format,
                    'size': metadata.size,
                };
            } catch (e) {
                event.reply('proj:error', { 'name': "Unnable to read " + images[i] + ', Ignoring...' });
            }
        }
        projectData.imagesCount = images.length;

        // Finished
        fs.writeFileSync(path.join(projLocation, 'project.json'), JSON.stringify(projectData));
        this.addProject(args);
        event.reply('proj:finished');
    }
}

exports.ProjectController = ProjectController;