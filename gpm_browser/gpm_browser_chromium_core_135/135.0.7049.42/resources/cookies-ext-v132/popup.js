
var btnTestSyncAction = document.getElementById('btnTestSyncAction');

btnTestSyncAction.onclick = function()
{
    // var port = chrome.extension.connect({
    //     name: "Sample Communication"
    // });
	// port.postMessage({code:'ConnectServer', value:'DoIt'});

    // chrome.runtime.sendMessage({
    //     command: 'save_settings',
    //     settings: {
    //         key_pro: txtKeyPro.value,
    //         query_selector: txtClassName1.value,
    //         query_selector_link_fb: txtClassName2.value,
    //     }
    // });
    // chrome.runtime.sendMessage({
    //     command: 'fake_click'
    // });
    chrome.tabs.query({currentWindow: true, active: true}, function (tabs){
        var activeTab = tabs[0];
        chrome.tabs.sendMessage(activeTab.id, {
            command: 'fake_click'
        });
    });
    console.log('btnTestSyncAction send fake_click');
}

// listen for messages sent from background.js
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
    switch(request.command){
        case 'return_settings':
            txtKeyPro.value = request.settings.key_pro;
            txtClassName1.value = request.settings.query_selector;
            txtClassName2.value = request.settings.query_selector_link_fb;
            break;
    }
});

// chrome.runtime.sendMessage({
//     command: 'get_settings'
// });