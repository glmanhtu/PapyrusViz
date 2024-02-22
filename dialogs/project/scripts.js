let $ = jQuery = require('jquery');
const { ipcRenderer } = require('electron');


function cancel() {
    ipcRenderer.send('open-welcome-dialog');
}