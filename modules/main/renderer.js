/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */

const { ipcRenderer } = require('electron');
const fs = require('fs');
const { event } = require('jquery');
let $ = jQuery = require('jquery');
require('jquery-lazy');
require('bootstrap');
let project = null;
let projectPath = null;
let imageDict = {};
let searchResults = [];
let queryImgId = null;
const nItemsPerPage = 10;

const board = document.getElementById('board');
board.addEventListener('click', () => {
    clearActiveImage();
});

$('#thumbnail-column .thumbnail-tabs a').on('click', function (e) {
    e.preventDefault()
    $(this).tab('show')
});

$('#thumbnail-filter').on('keyup', function (e) {
    const val = $(this).val();
    if (val.length === 0 || val.length > 1) {
        loadThumbnails();
    }
});

$('#assembling-tabs').on('click', '.assembling-tab', function () {
    const prevActiv = getActiveAssembling();
    const prevActivId = prevActiv.attr('data-assembledId');
    const activId = $(this).attr('data-assembledId')
    if (activId !== prevActivId) {
        prevActiv.removeClass('active');
        prevActiv.removeAttr('id');
        $(this).attr('id', 'current-assembling');
        $(this).addClass('active');
        if (project.assembled[prevActivId]) {
            project.assembled[prevActivId].activated = false;
        }
        project.assembled[activId].activated = true;
        drawAssembledImage(project.assembled[parseInt(activId)].images);
    }
});


// Event listener for keydown event
document.addEventListener('keydown', (event) => {
    if (event.key === 'i') {
        zoomIn(0.01);
    } else if (event.key === 'o') {
        zoomOut(0.01);
    } else if (event.key === 'r') {
        rotateRight(1);
    } else if (event.key === 'l') {
        rotateLeft(1);
    }
});

$.fn.waitForImages = function (callback) {
    var $img = $(this),
        totalImg = $img.length;

    var waitImgLoad = function () {
        totalImg--;
        if (!totalImg) {
            callback();
        }
    };

    $img.each(function () {
        if (this.complete) {
            waitImgLoad();
        }
    })

    $img.on('load', waitImgLoad)
        .on('error', waitImgLoad);
};

ipcRenderer.on('resized', (event, size) => {
    let prevLazy = $('#thumbnails-lazy').data("plugin_lazy");
    if (prevLazy) {
        // Temporary fix the problem when lazy object doesn't load after user resize the window
        prevLazy.loadAll();
    }
    prevLazy = $('#match-lazy').data("plugin_lazy");
    if (prevLazy) {
        // Temporary fix the problem when lazy object doesn't load after user resize the window
        prevLazy.loadAll();
    }
});

$('#thumbnail-column').on('dblclick', 'figure', function () {
    const board = $('#board');
    const key = $(this).attr('data-img-id');
    let fullImage = board.children(`*[data-img-id=${key}]`);
    if (fullImage.length === 0) {
        fullImage = addImageToBoard(key);
        const activeAssembling = project.assembled[getActiveAssemblingId()];
        activeAssembling.imagesCount += 1;
        activeAssembling.images[key] = { 'zIndex': activeAssembling.imagesCount };
        fullImage.style.zIndex = activeAssembling.imagesCount;
        alertUnsaved();
    } else {
        setActiveImage(fullImage.get()[0]);
    }
});

function removeMatching() {
    if (project.matching) {
        project.matching = null;
        $('#no-similarity').css('display', 'block');
        $('#has-similarity').css('display', 'none');
        $('#matched-results').html('');
        $('#matching-query').css('display', 'none');
        save();
    }
}

function drawAssembledImage(images) {
    const board = document.getElementById('board');
    board.innerHTML = '';
    for (const [imgId, imageTransforms] of Object.entries(images)) {
        const image = project.images[parseInt(imgId)];
        const fullImage = addImageToBoard(imgId);
        fullImage.style.zIndex = imageTransforms['zIndex'];
        const rotation = imageTransforms['rotation'] || 0;
        const scale = imageTransforms['scale'] || 1;
        fullImage.style.transform = `rotate(${rotation}deg)`;
        fullImage.width = Math.round(scale * image.width);
        fullImage.height = Math.round(scale * image.height);
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
    fullImage.setAttribute('class', 'board-img');
    fullImage.width = imgInfo.width;
    fullImage.height = imgInfo.height;
    fullImage.title = imgInfo.name;
    setActiveImage(fullImage);
    board.appendChild(fullImage);
    dragElement(fullImage);
    fullImage.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveImage(fullImage);
    });
    return fullImage;
}

function addAssemblingToTabs(key) {
    const assembledInfo = project.assembled[key];
    const tab = $('#assembling-tab-template').clone()
        .removeAttr('id')
        .removeAttr('style')
        .addClass('assembling-tab-head');
    const tabA = tab.children('a');
    tabA.html(`${assembledInfo.name}` + '<span>●</span>');
    tabA.addClass('assembling-tab');
    if (assembledInfo.activated) {
        tabA.addClass('active');
        tabA.attr('id', 'current-assembling');
        drawAssembledImage(assembledInfo.images);
    }
    tabA.attr(`data-assembledId`, key);
    tab.appendTo('#assembling-tabs');
    return tab;
}

function drawAssemblings() {
    $('.assembling-tab').each(function (i, e) {
        e.remove();
    });


    for (const [key, assembledInfo] of Object.entries(project.assembled)) {
        addAssemblingToTabs(key);
    }
}

function createAssembling() {
    const assembleId = project.assembledCount;
    const assemblingInfo = {
        'name': `Assembling #${assembleId + 1}`,
        'parent': 'default',
        'activated': true,
        'images': {},
        'imagesCount': 0,
        'createdAt': Date.now()
    };
    project.assembled[assembleId] = assemblingInfo;
    project.assembledCount += 1;
    const tab = addAssemblingToTabs(assembleId);
    tab.children('a').trigger('click');
    alertUnsaved();
}

function loadPartThumbnails(container, imgList, fromIdx, toIdx) {
    for (let i = fromIdx; i < Math.min(toIdx, imgList.length); i++) {
        const imgPath = imgList[i];
        const imgId = imageDict[imgPath];
        const imgInfo = project.images[imgId];

        const thumbnail = $('#thumbnail-template').clone()
            .css('display', 'block')
            .removeAttr('id')
            .attr('data-img-id', imgId);

        thumbnail.children('img')
            .addClass('thumbnails-block' + toIdx)
            .attr('src', 'file://' + imgInfo.thumbnails);
        thumbnail.children('figcaption')
            .html(imgInfo.name);
        thumbnail.appendTo(container);
    }
    if (toIdx < imgList.length) {
        const lazyThumb = $('<div>', { id: 'thumbnails-lazy', 'data-loader': "nextThumbnails" });
        $('.thumbnails-block' + toIdx).waitForImages(function () {
            lazyThumb.appendTo(container);
            lazyThumb.Lazy({
                scrollDirection: 'vertical',
                chainable: false,
                effect: "fadeIn",
                effectTime: 200,
                threshold: 0,
                appendScroll: $('#thumbnails'),
                nextThumbnails: function (element) {
                    const lazyObj = lazyThumb.data("plugin_lazy");
                    if (lazyObj) {
                        lazyObj.destroy();
                    }
                    lazyThumb.remove();
                    loadPartThumbnails(container, imgList, toIdx, toIdx + nItemsPerPage);
                }
            });
        });
    }

}

function loadThumbnails() {
    const prevLazy = $('#thumbnails-lazy').data("plugin_lazy");
    if (prevLazy) {
        prevLazy.destroy();
    }

    const thumbnailContainer = $('#thumbnail-images');
    thumbnailContainer.html('');

    const selectedDir = document.getElementById("root-dirs").value;
    if (selectedDir !== project.rootDirs.selected) {
        project.rootDirs.selected = selectedDir;
    }

    imageDict = {};
    const imagePathList = [];
    const filterVal = $('#thumbnail-filter').val();
    for (const [key, imgInfo] of Object.entries(project.images)) {
        imageDict[imgInfo.path] = parseInt(key);
        if (!imgInfo.path.includes(selectedDir)) {
            continue;
        }

        if (!imgInfo.path.includes(filterVal)) {
            continue;
        }
        imagePathList.push(imgInfo.path);
    };
    loadPartThumbnails(thumbnailContainer, imagePathList, 0, nItemsPerPage);
}

ipcRenderer.on('project-loaded', async (event, projPath) => {
    project = await ipcRenderer.invoke('proj:get-project', { 'projPath': projPath });
    projectPath = projPath;

    $('#root-dirs').empty();
    $('#sim-root-dirs').empty();
    project.rootDirs.available.forEach(root => {
        let isSelected = false;
        if (project.rootDirs.selected === root.path) {
            isSelected = true;
        }
        $('#root-dirs').append(new Option(root.name, root.path, isSelected, isSelected));
        $('#sim-root-dirs').append(new Option(root.name, root.path, isSelected, isSelected));
    });

    if (project.matching) {
        $('#no-similarity').css('display', 'none');
        $('#has-similarity').css('display', 'flex');
        $('#matching-name').val(project.matching.matchingName);
    } else {
        $('#no-similarity').css('display', 'block');
        $('#has-similarity').css('display', 'none');
        $('#matched-results').html('');
        $('#matching-query').css('display', 'none');
    }

    drawAssemblings();

    $('#proj-name').html(`Project: ${project.projName}`);

    loadThumbnails();
});

window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (e.target.className.includes('assembling-tab')) {
        const tabId = parseInt(e.target.dataset.assembledid);
        ipcRenderer.send('main:tab-context-menu', { assembleId: tabId });
    }
    else if (e.target.className == 'board-img') {
        setActiveImage(e.target);
        const imageId = parseInt(e.target.dataset.imgId);
        const matching = project.matching;
        const imgPath = e.target.src;
        const switchVersions = [];
        let imgRoot = "";
        project.rootDirs.available.forEach(root => {
            if (imgPath.includes(root.path) && root.path !== "") {
                imgRoot = root.path;
            }
        });
        const subImgPath = imgPath.split(imgRoot)[1];
        project.rootDirs.available.forEach(root => {
            if (imgRoot !== root.path) {
                const subDirImgPath = root.path + subImgPath;
                const imgId = imageDict[subDirImgPath];
                if (imgId) {
                    switchVersions.push({ 'name': root.name, 'imgId': imgId })
                }
            }
        });
        ipcRenderer.send('main:img-context-menu', { imageId: imageId, matching: matching, switchVersions: switchVersions });
    }
});

ipcRenderer.on('main:menu:tab-delete', async (event, args) => {
    const confirm = await ipcRenderer.invoke('dialogs:confirm', { title: 'Delete assembled image', content: 'Are you sure? This can not be undone !' });
    if (confirm) {
        const currentAssemblingTab = $(`.assembling-tab[data-assembledid="${args.assembleId}"]`);
        delete project.assembled[args.assembleId];
        drawAssemblings();
        save();
    }
});

ipcRenderer.on('main:menu:tab-rename', (event, args) => {

    const currentAssemblingTab = $(`.assembling-tab[data-assembledid="${args.assembleId}"]`);
    const renameInput = $('<input>', { id: 'renameAssembling', class: 'form-control form-control-sm', "data-assembling-id": args.assembleId });
    currentAssemblingTab.replaceWith(renameInput);
    renameInput.val(project.assembled[args.assembleId].name);
    renameInput.trigger('focus');
    renameInput.on('keyup', function (e) {
        if (e.key === 'Escape') {
            renameInput.replaceWith(currentAssemblingTab);
        } else if (e.key === 'Enter') {
            project.assembled[args.assembleId].name = renameInput.val();
            currentAssemblingTab.html(`${renameInput.val()}` + '<span>●</span>');
            currentAssemblingTab.children('span').addClass('unsaved');
            renameInput.replaceWith(currentAssemblingTab);
        }
    });
});

ipcRenderer.on('main:menu:switch-image', (event, args) => {
    const imgId = args['imageId'];
    const toImageId = args['toImage'];
    const img = project.images[imgId];
    const targetImg = project.images[toImageId];
    const activeAssembling = project.assembled[getActiveAssemblingId()];

    const scaledImgWidth = img.width * activeAssembling.images[imgId].scale;
    const targetScaled = scaledImgWidth / targetImg.width;
    activeAssembling.images[toImageId] = activeAssembling.images[imgId];
    activeAssembling.images[toImageId].scale = targetScaled;
    delete activeAssembling.images[imgId];
    drawAssembledImage(activeAssembling.images);
    setActiveImage($(`.board-img[data-img-id="${toImageId}"]`).get()[0]);
    alertUnsaved();
});

ipcRenderer.on('main:menu:img-delete', (event, args) => {
    const image = getActiveImage()
    if (image) {
        const imageId = parseInt(image.dataset.imgId);
        const activeAssembling = project.assembled[getActiveAssemblingId()];
        delete activeAssembling.images[imageId];
        image.remove();
        alertUnsaved();
    }
});

ipcRenderer.on('main:menu:img-to-front', (event, args) => {
    const image = getActiveImage()
    if (image) {
        const imageId = parseInt(image.dataset.imgId);
        const imgZIndex = parseInt(image.style.zIndex);
        let zIndexes = [];
        $('.board-img').each(function (i, element) {
            const elementZIndex = parseInt(element.style.zIndex);
            if (elementZIndex > imgZIndex) {
                zIndexes.push(elementZIndex);
                const domElementImgId = parseInt(element.dataset.imgId);
                setActiveAssemblingChanges(domElementImgId, 'zIndex', elementZIndex - 1);
                element.style.zIndex = elementZIndex - 1;
            }
        });
        const maxZIndex = Math.max(...zIndexes);
        setActiveAssemblingChanges(imageId, 'zIndex', maxZIndex);
        image.style.zIndex = maxZIndex;
        alertUnsaved();
    }
});

ipcRenderer.on('main:menu:save', (event, args) => {
    save();
});

ipcRenderer.on('main:menu:img-to-back', (event, args) => {
    const image = getActiveImage()
    if (image) {
        const imageId = parseInt(image.dataset.imgId);
        const imgZIndex = parseInt(image.style.zIndex);
        let zIndexes = [];
        $('.board-img').each(function (i, element) {
            const elementZIndex = parseInt(element.style.zIndex);
            if (elementZIndex < imgZIndex) {
                zIndexes.push(elementZIndex);
                const domElementImgId = parseInt(element.dataset.imgId);
                setActiveAssemblingChanges(domElementImgId, 'zIndex', elementZIndex + 1);
                element.style.zIndex = elementZIndex + 1;
            }
        });
        const minZIndex = Math.min(...zIndexes);
        setActiveAssemblingChanges(imageId, 'zIndex', minZIndex);
        image.style.zIndex = minZIndex;
        alertUnsaved();
    }
});


ipcRenderer.on('main:menu:img-find-similarity', async (event, args) => {
    const image = getActiveImage()
    if (image) {
        const imageId = parseInt(image.dataset.imgId);
        ipcRenderer.send('proj:find-matching', { 'projPath': projectPath, 'imageId': imageId });
    }
});


function loadPartSimilarityResults(container, matches, fromIdx, toIdx, rank, prevDistance) {
    for (let i = fromIdx; i < Math.min(toIdx, matches.length); i++) {
        const matchedImgResult = matches[i];
        const matchedImgId = parseInt(matchedImgResult['imgId']);
        const matchedImgDistance = matchedImgResult['distance'];
        if (matchedImgDistance > prevDistance) {
            prevDistance = matchedImgDistance;
            rank += 1;
        }
        const matchedImg = project.images[matchedImgId];
        const matchedItem = $('#matching-result-template').clone()
            .removeAttr('id')
            .css('display', 'block')
            .attr('data-img-id', matchedImgId);
        matchedItem.children('img')
            .addClass('match-block' + toIdx)
            .attr('src', 'file://' + matchedImg.thumbnails);
        matchedItem.children('figcaption').html('#' + rank + ' ' + matchedImg.name);
        matchedItem.appendTo(container);
    }
    if (toIdx < matches.length) {
        const matchObj = $('<div>', { id: 'match-lazy', 'data-loader': "nextMatches" });
        $('.match-block' + toIdx).waitForImages(function () {
            matchObj.appendTo(container);
            matchObj.Lazy({
                scrollDirection: 'vertical',
                chainable: false,
                effect: "fadeIn",
                effectTime: 200,
                threshold: 0,
                appendScroll: $('#similarity'),
                nextMatches: function (element) {
                    const lazyObj = matchObj.data("plugin_lazy");
                    if (lazyObj) {
                        lazyObj.destroy();
                    }
                    matchObj.remove();
                    loadPartSimilarityResults(container, matches, toIdx, toIdx + nItemsPerPage, rank, prevDistance);
                }
            });
        });
    }

}

function loadSearchResults() {
    $('.thumbnail-tabs a[href="#similarity"]').tab('show');

    const prevLazy = $('#match-lazy').data("plugin_lazy");
    if (prevLazy) {
        prevLazy.destroy();
    }

    const queryImg = project.images[queryImgId];
    const matches = [];

    const selectedDir = document.getElementById("sim-root-dirs").value;
    searchResults.forEach(element => {
        const matchedImgId = parseInt(element['imgId']);
        const matchedImg = project.images[matchedImgId];
        if (matchedImg.path.includes(selectedDir)) {
            matches.push(element);
        }
    });

    const queryDom = $('#matching-query').css('display', 'block');
    queryDom.children('img').attr('src', queryImg.path);
    queryDom.children('figcaption').html(queryImg.name);

    const matchesContainer = $('#matched-results');
    matchesContainer.html('');
    let rank = 0;
    let prevDistance = 0;

    loadPartSimilarityResults(matchesContainer, matches, 0, nItemsPerPage, rank, prevDistance);
}

ipcRenderer.on('main:matching:results', async (event, args) => {
    searchResults = args['matches'];
    queryImgId = args['queryImg'];
    loadSearchResults();
});


function save() {
    ipcRenderer.invoke('proj:save-project', { 'projPath': projectPath, 'project': project }).then((result) => {
        if (result) {
            $('.assembling-tab').each(function (i, element) {
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
    clearActiveImage();
    comp.setAttribute('id', 'activated-image');
}

function clearActiveImage() {
    prevActiv = getActiveImage();
    if (prevActiv) {
        prevActiv.removeAttribute('id');
    }
}

function getActiveImage() {
    return document.getElementById('activated-image');
}

function selectSimilarityMatrix() {
    save();
    ipcRenderer.send('main:open-create-similarity', { projectPath });
}

function openDialog() {
    ipcRenderer.send('dialogs:open-images-dialog');
}

function rotateLeft(step = 5) {
    const image = getActiveImage()
    if (image) {
        const imageId = parseInt(image.dataset.imgId);
        const rotation = (getActiveAssemblingChanges(imageId, 'rotation') || 0) - step;
        image.style.transform = `rotate(${rotation}deg)`;
        setActiveAssemblingChanges(imageId, 'rotation', rotation);
    }
}

function rotateRight(step = 5) {
    return rotateLeft(-step);
}

function zoomIn(step = 0.1) {
    const image = getActiveImage();
    if (image) {
        const imageId = parseInt(image.dataset.imgId);
        let scale = parseFloat(getActiveAssemblingChanges(imageId, 'scale') || 1) + step;
        if (scale < 0.05) {
            scale = 0.05;
        }
        image.width = Math.round(scale * project.images[imageId].width);
        image.height = Math.round(scale * project.images[imageId].height);
        setActiveAssemblingChanges(imageId, 'scale', scale);
    }
}

function zoomOut(step = 0.1) {
    return zoomIn(-step);
}

function exportImg() {
    ipcRenderer.send('main:export-img', { project: project, activeAssemblingId: getActiveAssemblingId() });
}

function dragElement(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    elmnt.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        if (e.button && e.button == 2) {
            return;
        }
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