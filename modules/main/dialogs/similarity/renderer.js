let $ = jQuery = require('jquery');
const { ipcRenderer } = require('electron');
let projPath = null;

function selectFile(targetId) {
    ipcRenderer.send('dialogs:open-file-dialog', { 'target': targetId, 'filters': ['csv'] });
}

function cancel() {
    ipcRenderer.send('dialogs:close');
}

$('#similarityCreation').on('submit', (e) => {
    const matchingName = $('#matching-name').val();
    const matchingFile = $('#similarity-file').val();
    const matchingMethod = $('input[name=match-method]:checked', '#similarityCreation').val()
    const matrixType = $('input[name=matrix-type]:checked', '#similarityCreation').val()

    ipcRenderer.send('proj:create-matching', {
        'projPath': projPath,
        'matchingName': matchingName,
        'matchingFile': matchingFile,
        'matrixType': matrixType,
        'matchingMethod': matchingMethod
    });
    e.preventDefault();
});


ipcRenderer.on('selected-file', (event, args) => {
    const dir = args[0];
    const targetId = args[1]['target'];
    $(`#${targetId}`).val(dir[0]);
    $(`#${targetId}`).next('.custom-file-label').html(dir[0]);
});


ipcRenderer.on('project-path', async (event, args) => {
    projPath = args.projectPath;
});