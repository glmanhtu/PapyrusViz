const { ipcRenderer } = require('electron');
let $ = jQuery = require('jquery');


(async () => {
    const projects = await ipcRenderer.invoke('proj:get-projects');
    if (projects.length === 0) {
        $('#no-proj').css('display', 'table-row');
    } else {
        $('#no-proj').css('display', 'none');
        let counter = 0;
        projects.forEach(project => {
            const projId = `proj-${counter}`;
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
            counter += 1;
        });
    }
})();

function createProject() {
    ipcRenderer.send('proj:open-create-project');
}
