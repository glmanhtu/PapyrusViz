
const { BrowserWindow, dialog } = require('electron');

let currentDlg = null;


module.exports.closeCurrentDialog = function() {
    if (currentDlg) {
        currentDlg.close();
        currentDlg = null;
    }
}

module.exports.getCurrentDialog = function() {
    return currentDlg;
}

module.exports.confirmDialog = function(win, title, content) {
    const result = dialog.showMessageBoxSync(win, {
        'type': 'question',
        'title': title,
        'message': content,
        'buttons': [
            'Yes',
            'No'
        ]
    });
    return result === 0;
}

module.exports.openDialog = function(dialogPath, win, width=800, height=600, projPath=null) {
    this.closeCurrentDialog();

    currentDlg = new BrowserWindow({ 
            parent: win, 
            modal: true, 
            show: false,  
            width: width,
            height: height,
            // transparent: true,
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
        if (projPath) {
            currentDlg.webContents.send('project-path', projPath);
        }
        currentDlg.show();
    });
    return currentDlg;
}

module.exports.errorDialog = function(win, title, content) {
  dialog.showMessageBoxSync(win, {
    type: 'error',
    buttons: ['Close'],
    defaultId: 0,
    title: 'Error',
    message: title,
    detail: content
  }); 
}

