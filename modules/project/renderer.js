const { ipcRenderer } = require('electron');

function createProject() {
    ipcRenderer.send('proj:open-create-project');
}