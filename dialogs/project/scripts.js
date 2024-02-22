let $ = jQuery = require('jquery');
const { ipcRenderer } = require('electron');
const fs = require('fs');


function cancel() {
    ipcRenderer.send('open-welcome-dialog');
}

function selectFolder(targetId) {
    ipcRenderer.send('open-dir-dialog', targetId);
}

ipcRenderer.on('selected-dir', (event, args) => {
    const dir = args[0];
    const targetId = args[1];
    $(`#${targetId}`).val(dir[0]);
    $(`#${targetId}`).next('.custom-file-label').html(dir[0]);
});

$('#projectCreation').on('submit', (e) => {
    const projectName = $('#projName').val();
    const projectPath = $('#inputLocation').val();
    let isDirExists = fs.existsSync(projectPath) && fs.lstatSync(projectPath).isDirectory();
    if (!isDirExists) {
        
    }
    const datasetPath = $('#inputDataset').val();

    e.preventDefault();
});