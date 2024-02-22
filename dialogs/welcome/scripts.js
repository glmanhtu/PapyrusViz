const { ipcRenderer } = require('electron');

function createProject() {
    ipcRenderer.send('open-create-project');
}