const { app } = require('electron');
const path = require('node:path');

let currentDlg = null;

module.exports.fromRoot = function(...paths) {
    return path.join(app.getAppPath(), ...paths);
}


module.exports.fromAppData = function(...paths) {
    return path.join(app.getPath('appData'), ...paths);
}