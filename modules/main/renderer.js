/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */

const { ipcRenderer } = require('electron');
const fs = require('fs');
let $ = jQuery = require('jquery');
let project = null;
let projectPath = null;


function drawAssembledImage(images) {
    const board = document.getElementById('board');
    board.innerHTML = '';
    for (const [imgId, imageTransforms] of Object.entries(images)) {
        const fullImage = addImageToBoard(imgId);
        fullImage.style.zIndex = imageTransforms['zIndex'];
        const rotation = imageTransforms['rotation'] || 0;
        const scale = imageTransforms['scale'] || 1;
        fullImage.style.transform = `scale(${scale}) rotate(${rotation}deg)`;
        fullImage.style.top = imageTransforms['top'] + 'px' || '10px';
        fullImage.style.left = imageTransforms['left'] + 'px' || '10px';
    } 
}

function addImageToBoard(imgId) {
    const board = document.getElementById('board');
    const imgInfo = project.images[imgId]
    const fullImage = new Image();
    fullImage.dataset.imgId = imgId;
    fullImage.src = 'file://' + imgInfo.path;
    fullImage.setAttribute('class', 'board-img')
    setActiveImage(fullImage);
    board.appendChild(fullImage);
    dragElement(fullImage);
    fullImage.addEventListener('click', () => {
        setActiveImage(fullImage);
    });
    return fullImage;
}

function addAssemblingToTabs(key) {
    const assembledInfo = project.assembled[key];
    const tab = $('#assembling-tab-template').clone().css('display', 'list-item');
    const tabA = tab.children('a');
    tabA.html(assembledInfo.name + '<span>●</span>');
    tabA.addClass('assembling-tab');
    if (assembledInfo.activated) {
        tabA.addClass('active');
        tabA.attr('id', 'current-assembling');
        drawAssembledImage(assembledInfo.images);
    }
    tabA.attr(`data-assembledId`, key);
    tabA.on('click', function() {
        const prevActiv = getActiveAssembling();
        const prevActivId = prevActiv.attr('data-assembledId');
        const activId = $(this).attr('data-assembledId')
        if (activId !== prevActivId) {
            prevActiv.removeClass('active');
            prevActiv.removeAttr('id');
            $(this).attr('id', 'current-assembling');
            $(this).addClass('active');
            project.assembled[prevActivId].activated = false;
            project.assembled[activId].activated = true;
            drawAssembledImage(project.assembled[key].images);
        }
    });
    tab.appendTo('#assembling-tabs');
    return tab;
}

function createAssembling() {
    const assembleId = project.assembledCount;
    const assemblingInfo = {'name': `Assembling #${assembleId + 1}`, 'activated': true, 'images': {}, 'imagesCount': 0, 'createdAt': Date.now()};
    project.assembled[assembleId] = assemblingInfo;
    project.assembledCount += 1;
    const tab = addAssemblingToTabs(assembleId);
    tab.children('a').trigger('click');
    alertUnsaved();
}

ipcRenderer.on('project-loaded', async (event, projPath) => {
    project = await ipcRenderer.invoke('proj:get-project', {'projPath': projPath});
    projectPath = projPath;
    const thumbnailContainer = document.getElementById('thumbnail-container');

    for (const [key, assembledInfo] of Object.entries(project.assembled)) {
        addAssemblingToTabs(key);
    }
    
    $('#proj-name').html(`Project: ${project.projName}`);
    for (const [key, imgInfo] of Object.entries(project.images)) {
        const thumbnail = new Image();
        thumbnail.src = 'file://' + imgInfo.thumbnails;
        thumbnail.dataset.imgId = key;
        thumbnail.className = 'img-thumbnail row';
        thumbnail.style.cursor = 'pointer';
        thumbnailContainer.appendChild(thumbnail);

        // Add click event listener to display full-size image
        thumbnail.addEventListener('dblclick', () => {
            const board = $('#board');
            let fullImage = board.children(`*[data-img-id=${key}]`);
            if (fullImage.length === 0) {
                fullImage = addImageToBoard(key);
                const activeAssembling = project.assembled[getActiveAssemblingId()];
                activeAssembling.imagesCount += 1;
                activeAssembling.images[key] = {'zIndex': activeAssembling.imagesCount};
                fullImage.style.zIndex = activeAssembling.imagesCount;
                alertUnsaved();
            } else {
                setActiveImage(fullImage.get()[0]);
            }
        });
    };
});

repeatActionOnHold('i', () => zoomIn(0.01));
repeatActionOnHold('o', () => zoomOut(0.01));
repeatActionOnHold('r', () => rotateRight(1));
repeatActionOnHold('l', () => rotateLeft(1));

ipcRenderer.on('resized', (event, size) => {
    var height = size[1];
    document.getElementById('thumbnail-container').style.height = `${height - 140}px`;
    document.getElementById('board').style.height = `${height - 140}px`;
});

function save() {
    ipcRenderer.invoke('proj:save-project', {'projPath': projectPath, 'project': project}).then((result) => {
        if (result) {
            $('.assembling-tab').each(function(i, element) {
                const assembledStatus = $(this).children('span');
                if (assembledStatus.hasClass('unsaved')) {
                    assembledStatus.removeClass('unsaved');
                    assembledStatus.addClass('saved');
                }
            })
        }
    });
}

function getActiveAssembling() {
    return $('#current-assembling');
}

function getActiveAssemblingId() {
    return getActiveAssembling().attr('data-assembledId');
}

function alertUnsaved() {
    getActiveAssembling().children('span').addClass('unsaved');
}

function setActiveAssemblingChanges(imageId, name, value) {
    const activeAssembling = project.assembled[getActiveAssemblingId()];
    const imageChange = activeAssembling.images[imageId];
    imageChange[name] = value;
    alertUnsaved();
}

function getActiveAssemblingChanges(imageId, name) {
    const activeAssembling = project.assembled[getActiveAssemblingId()];
    const imageChange = activeAssembling.images[imageId];
    return imageChange[name];
}

function setActiveImage(comp) {
    prevActiv = getActiveImage();
    if (prevActiv != null) {
        prevActiv.setAttribute('id', '');
    }
    comp.setAttribute('id', 'activated-image');
}

function getActiveImage() {
    return document.getElementById('activated-image');
}

function openDialog() {
    ipcRenderer.send('dialogs:open-images-dialog');
}

function rotateLeft(step=5) {
    const image = getActiveImage()
    if (image) {
        const imageId = parseInt(image.dataset.imgId);
        const rotation = (getActiveAssemblingChanges(imageId, 'rotation') || 0) - step;
        const scale = parseFloat(getActiveAssemblingChanges(imageId, 'scale') || 1);
        image.style.transform = `scale(${scale}) rotate(${rotation}deg)`;
        setActiveAssemblingChanges(imageId, 'rotation', rotation);
    }
}

function rotateRight(step=5) {
    return rotateLeft(-step);
}

function zoomIn(step=0.1) {
    const image = getActiveImage()
    if (image) {
        const imageId = parseInt(image.dataset.imgId);
        const rotation = (getActiveAssemblingChanges(imageId, 'rotation') || 0);
        const scale = parseFloat(getActiveAssemblingChanges(imageId, 'scale') || 1) + step;
        if (scale < 0.05) {
            scale = 0.05;
        }
        image.style.transform = `scale(${scale}) rotate(${rotation}deg)`;
        setActiveAssemblingChanges(imageId, 'scale', scale);
    }
}

function zoomOut(step=0.1) {
    return zoomIn(-step);
}

function exportImg() {
    const rect = document.querySelector('#board').getBoundingClientRect();
    ipcRenderer.send('main:export-img', {x: parseInt(rect.left), y: parseInt(rect.top), width: parseInt(rect.width), height: parseInt(rect.height)});
}

function dragElement(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    elmnt.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        // get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;
        setActiveImage(elmnt);
        document.onmouseup = closeDragElement;
        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        // calculate the new cursor position:
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // set the element's new position:
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
        elmnt.style.cursor = "move";
        const imageId = parseInt(elmnt.dataset.imgId);
        setActiveAssemblingChanges(imageId, 'top', elmnt.offsetTop - pos2);
        setActiveAssemblingChanges(imageId, 'left', elmnt.offsetLeft - pos1);
    }

    function closeDragElement() {
        /* stop moving when mouse button is released:*/
        document.onmouseup = null;
        document.onmousemove = null;
        elmnt.style.cursor = "unset";
    }
}


function repeatActionOnHold(key, actionFunction) {
    // Event listener for keydown event
    document.addEventListener('keydown', (event) => {
        if (event.key === key) {
            actionFunction()
        }
    });

}