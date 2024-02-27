const { ipcRenderer } = require('electron');
let $ = jQuery = require('jquery');


(async () => {
    const projects = await ipcRenderer.invoke('proj:get-projects');
    if (projects.length === 0) {
        $('#no-proj').css('display', 'table-row');
    } else {
        $('#no-proj').css('display', 'none');
        projects.forEach(project => {
            let projTemplate = $('#proj-template').clone().css('display', 'table-row');
            projTemplate.children('.proj-name').html(project['projName']);
            projTemplate.children('.proj-path').html(project['projPath']);
            projTemplate.find('.proj-open').on('click', function() {
                openProject(project['projPath']);
            });
            projTemplate.find('.proj-del').on('click', function() {

            })
            projTemplate.appendTo('#proj-list');
        });
    }
})();

function createProject() {
    ipcRenderer.send('proj:open-create-project');
}

function openProject(projPath) {
    ipcRenderer.send('proj:open-project', {'projPath': projPath});
}

function deleteProject() {

}