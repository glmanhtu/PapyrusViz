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

(async () => {
    const thumbnailContainer = document.getElementById('thumbnail-container');
    const board = document.getElementById('board');
    const project = await ipcRenderer.invoke('proj:get-current-project');
    console.log(project);
    
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
            if (thumbnail.ref == undefined) {
                const fullImage = new Image();
                fullImage.dataset.imgId = key;
                fullImage.src = 'file://' + imgInfo.path;
                setActiveComponent(fullImage);
                board.appendChild(fullImage);
                thumbnail.ref = fullImage;
                dragElement(fullImage);
                fullImage.addEventListener('click', () => {
                    setActiveComponent(fullImage);
                })
            } else {
                setActiveComponent(thumbnail.ref);
            }
        });
    };

    for (const [key, assembledInfo] of Object.entries(project.assembled)) {
        const tab = $('#assembling-tab-template').clone().css('display', 'list-item');
        const tabA = tab.children('a');
        tabA.html(assembledInfo.name);
        if (assembledInfo.activated) {
            tabA.addClass('active');
        }
        tabA.attr(`data-assembledId`, key);
        tab.prependTo('#assembling-tabs');
    }

})();

repeatActionOnHold('i', () => zoomIn(0.01));
repeatActionOnHold('o', () => zoomOut(0.01));
repeatActionOnHold('r', () => rotateRight(1));
repeatActionOnHold('l', () => rotateLeft(1));

ipcRenderer.on('resized', (event, size) => {
    var height = size[1];
    document.getElementById('thumbnail-container').style.height = `${height - 140}px`;
    document.getElementById('board').style.height = `${height - 140}px`;
});

function setActiveComponent(comp) {
    prevActiv = getActiveComponent();
    if (prevActiv != null) {
        prevActiv.setAttribute('id', '');
    }
    comp.setAttribute('id', 'activated-component');
}

function getActiveComponent() {
    return document.getElementById('activated-component');
}

function openDialog() {
    ipcRenderer.send('dialogs:open-images-dialog');
}

function rotateLeft(step=5) {
    const image = getActiveComponent()
    if (image) {
        const rotation = parseInt(image.dataset.rotation || 0) - step;
        const scale = parseFloat(image.dataset.scale || 1);
        image.style.transform = `scale(${scale}) rotate(${rotation}deg)`;
        image.dataset.rotation = rotation;
    }
}

function rotateRight(step=5) {
    const image = getActiveComponent()
    if (image) {
        const rotation = parseInt(image.dataset.rotation || 0) + step;
        const scale = parseFloat(image.dataset.scale || 1);
        image.style.transform = `scale(${scale}) rotate(${rotation}deg)`;
        image.dataset.rotation = rotation;
    }
}

function zoomIn(step=0.1) {
    const image = getActiveComponent()
    if (image) {
        const rotation = parseInt(image.dataset.rotation || 0);
        const scale = parseFloat(image.dataset.scale || 1) + step;
        image.style.transform = `scale(${scale}) rotate(${rotation}deg)`;

        image.dataset.scale = scale;
    }
}

function zoomOut(step=0.1) {
    const image = getActiveComponent()
    if (image) {
        const rotation = parseInt(image.dataset.rotation || 0);
        const scale = parseFloat(image.dataset.scale || 1) - step;
        image.style.transform = `scale(${scale}) rotate(${rotation}deg)`;
        image.dataset.scale = scale;
    }
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
        setActiveComponent(elmnt);
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