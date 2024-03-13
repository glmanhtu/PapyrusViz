const { app } = require('electron');
const fs = require('fs');
const path = require('node:path');

let currentDlg = null;

module.exports.fromRoot = function (...paths) {
    return path.join(app.getAppPath(), ...paths);
}


module.exports.fromAppData = function (...paths) {
    const appDataPath = path.join(app.getPath('appData'), 'papyviz')
    const isExists = fs.existsSync(appDataPath) && fs.lstatSync(appDataPath).isDirectory();
    if (!isExists) {
        fs.mkdirSync(appDataPath);
    }
    return path.join(appDataPath, ...paths);
}