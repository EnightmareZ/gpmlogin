var btnSave = document.getElementById('btnSave');
var txtDelayFrom = document.getElementById('txtDelayFrom');
var txtDelayTo = document.getElementById('txtDelayTo');

btnSave.onclick = function()
{
    // var port = chrome.extension.connect({
    //     name: "Sample Communication"
    // });
	// port.postMessage({code:'ConnectServer', value:'DoIt'});

    chrome.runtime.sendMessage({
        command: 'save_config',
        config: {
            delay_from: txtDelayFrom.value,
            delay_to: txtDelayTo.value,
        }
    });
}

// listen for messages sent from background.js
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
    switch(request.command){
        case 'return_config':
            txtDelayFrom.value = request.data.delay_from;
            txtDelayTo.value = request.data.delay_to;
            break;
    }
});

chrome.runtime.sendMessage({
    command: 'get_config'
});