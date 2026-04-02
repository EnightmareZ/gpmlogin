'use strict';

// Quản lý JSON trong localstorage
// https://stackoverflow.com/questions/34951170/save-json-to-chrome-storage-local-storage
var local = (function () {

    var setData = function (key, obj) {
        var values = JSON.stringify(obj);
        localStorage.setItem(key, values);
    }

    var getData = function (key) {
        let temp = localStorage.getItem(key);
        if (temp) {
            return JSON.parse(temp);
        } else {
            return false;
        }
    }

    var updateDate = function (key, newData) {
        if (localStorage.getItem(key) != null) {
            var oldData = JSON.parse(localStorage.getItem(key));
            for (keyObj in newData) {
                oldData[keyObj] = newData[keyObj];
            }
            var values = JSON.stringify(oldData);
            localStorage.setItem(key, values);
        } else {
            return false;
        }
    }

    return { set: setData, get: getData, update: updateDate }
})();


// A gotcha of sorts with chrome extensions involving clipboard actions is that
// only the content scripts can interact with the page that a user loads. This
// means that we can't put our calls to actually paste into the page in the
// background file, because the background scripts are not able to paste into
// the dom of the page. However, only background pages are able to access the
// system clipboard. Therefore we have to do a little trickery to move between
// the two. We're going to define the functions here to actually read from the
// clipboard into a textarea we've defined in our background html, and then
// we'll get that pasted data from the background page and do the actual
// insertion in our content script. The idea of this comes from:
// http://stackoverflow.com/questions/7144702/the-proper-use-of-execcommandpaste-in-a-chrome-extension
/**
 * Retrieve the current content of the system clipboard.
 */
function getContentFromClipboard() {
    var result = '';
    var sandbox = document.getElementById('sandbox');
    sandbox.value = '';
    sandbox.select();
    if (document.execCommand('paste')) {
        result = sandbox.value;
        console.log('got value from sandbox: ' + result);
    }
    sandbox.value = '';
    return result;
}

/**
 * Send the value that should be pasted to the content script.
 */
function sendPasteToContentScript(toBePasted) {
    // We first need to find the active tab and window and then send the data
    // along. This is based on:
    // https://developer.chrome.com/extensions/messaging
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        let config = local.get('config') || 'null';//database[data.uid] || 'null';
            if(config == 'null')
                config = { delay_from: 100, delay_to: 150 };
        chrome.tabs.sendMessage(tabs[0].id, {data: toBePasted, config: config});
    });
}

/**
 * The function that will handle our context menu clicks.
 */
function onClickHandler(info, tab) {
    var clipboardContent = getContentFromClipboard();
    // console.log('clipboardContent: ' + clipboardContent);
    if (info.menuItemId === 'gpmPaste') {
        // console.log('clicked paste demo');
        sendPasteToContentScript(clipboardContent);
    }
}

// Register the click handler for our context menu.
chrome.contextMenus.onClicked.addListener(onClickHandler);

// Set up the single one item "paste"
chrome.runtime.onInstalled.addListener(function(details) {
    chrome.contextMenus.create(
        {
            'title': 'GPM Paste (Ctrl + Shift + V)',
            'id': 'gpmPaste',
            'contexts': ['editable']
        });
});

chrome.commands.onCommand.addListener(function (command) {
    if (command === "command_gpm_paste") {
        // alert("save");
        var clipboardContent = getContentFromClipboard();
        sendPasteToContentScript(clipboardContent);
    } else if (command === "random") {
        alert("random");
    }
});

chrome.runtime.onMessage.addListener((data, sender) => {
    console.log(`data.command ${data.uid}`) // new url is now in content scripts!
    switch(data.command){
        case 'save_config':
            //database[data.uid] = data.note;
            local.set('config', data.config);
        break;
        case 'get_config':
            let config = local.get('config') || 'null';//database[data.uid] || 'null';
            if(config == 'null')
                config = { delay_from: 100, delay_to: 150 };

            if((sender?.tab?.id || null) != null){
                chrome.tabs.sendMessage( sender.tab.id, {
                    command: 'return_config',
                    data: config
                });
            } else {
                chrome.runtime.sendMessage({
                    command: 'return_config',
                    data: config
                });
            }
        break;
    }
}
);