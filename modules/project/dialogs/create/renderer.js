let $ = jQuery = require('jquery');
const { ipcRenderer } = require('electron');


function cancel() {
    ipcRenderer.send('proj:open-welcome-dialog');
}

function selectFolder(targetId) {
    ipcRenderer.send('dialogs:open-dir-dialog', {'target': targetId});
}

ipcRenderer.on('selected-dir', (event, args) => {
    const dir = args[0];
    const targetId = args[1]['target'];
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
    const projectPath = $('#inputLocation').val();
    $('#openProject').css('display', 'block').on('click', function() {
        ipcRenderer.send('proj:open-project', {'projPath': projectPath});
    });
});