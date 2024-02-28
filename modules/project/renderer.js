const { ipcRenderer } = require('electron');
let $ = jQuery = require('jquery');


(async () => {
    const projects = await ipcRenderer.invoke('proj:get-projects');
    if (projects.length === 0) {
        $('#no-proj').css('display', 'table-row');
    } else {
        $('#no-proj').css('display', 'none');
        for (let i = projects.length - 1; i >= 0; i -= 1) {
            const project = projects[i];
            const projId = `proj-${i}`;
            let projTemplate = $('#proj-template').clone().css('display', 'table-row').attr('id', projId);
            projTemplate.children('.proj-name').html(project['projName']);
            projTemplate.children('.proj-path').html(project['projPath']);
            projTemplate.find('.proj-open').on('click', function() {
                ipcRenderer.send('proj:open-project', {'projPath': project['projPath']});
            });
            projTemplate.find('.proj-del').on('click', function() {
                ipcRenderer.invoke('proj:del-project', {'projPath': project['projPath']}).then((result) => {
                    if (result) {
                        $(`#${projId}`).fadeOut();
                    }
                });
            })
            projTemplate.appendTo('#proj-list');
        }
    }
})();

function createProject() {
    ipcRenderer.send('proj:open-create-project');
}
