let $ = jQuery = require('jquery');
const { ipcRenderer } = require('electron');


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
    const datasetPath = $('#inputDataset').val();
    const projectPath = $('#inputLocation').val();
    e.preventDefault();
});