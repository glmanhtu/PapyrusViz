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
    const datasetPath = $('#inputDataset').val();
    
    ipcRenderer.send('proj:create-project', {
        'projName': projectName,
        'projPath': projectPath,
        'datasetPath': datasetPath
    });
    e.preventDefault();
});

ipcRenderer.on('proj:starting', (event, args) => {
    $('#projectCreation').css('display', 'none');
    $("#projectCreationProgress").css('display', 'block');
});

ipcRenderer.on('proj:progress', (event, args) => {
    const name = args['name'];
    const desc = args['desc'];
    const currentVal = args['current'];

    $('#progressTitle').html(name);
    $('#progressDesc').html(desc);
    $('#progressBar').css('width', currentVal+'%').attr('aria-valuenow', currentVal); 
});

ipcRenderer.on('proj:finished', (event, args) => {
    $('#openProject').css('display', 'block');
});