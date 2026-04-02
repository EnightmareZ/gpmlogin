function gpm_fake_event(x, y, type='click'){
    if(x == 0 && y == 0)
        return;
    var el = document.elementFromPoint(x, y);
    const evt = new Event(type, {"bubbles": false, "cancelable": true});
    if(el){
        if(type=='click')
            el.click(); // FIXME: Làm click liên hoàn gửi qua lại lẫn nhau liên tục
        else
            el.dispatchEvent(evt);
    }
    var box = document.getElementsByTagName('p-mouse-pointer')[0];
    if(box){
        box.style.left = String(x) + 'px';
        box.style.top = String(y) + 'px';
        box.classList.remove('p-mouse-pointer-hide');
        console.log(`fake ${x}-${y}`);
    }
    // document.dispatchEvent(evt);
}

const testPos_x = 72;
const testPos_y = 117;

function fakeClick(){
    console.log(`fakeClick Clicked`);
    gpm_fake_event(testPos_x, testPos_y);
}

function changeUrlCurrentTab(url){
    chrome.tabs.query({currentWindow: true, active: true}, function (tabs){
        var activeTab = tabs[0];
        chrome.tabs.sendMessage( activeTab.id, {
            command: 'tab_change_url',
            url: url
        });
    });
}

// listen for messages sent from background.js
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log(request);
    switch(request.command){
        case 'sync_action':

            let data_sync = request.data;
            switch(data_sync.type){
                case 'click':
                case 'dblclick':
                case 'mouseover':
                case 'mousemove':
                    gpm_fake_event(data_sync.x, data_sync.y, data_sync.type);
                    break;
                case 'tab_change_url':
                    changeUrlCurrentTab(data_sync.url);
                    break;
            }
            break;
    }
});

// Lắng nghe việc di chuyển chuột trên trang
// console.log('Content script hello');

function getPosFromEvent(event){
    var eventDoc, doc, body;
    if (event.pageX == null && event.clientX != null) {
            eventDoc = (event.target && event.target.ownerDocument) || document;
            doc = eventDoc.documentElement;
            body = eventDoc.body;

            event.pageX = event.clientX +
              (doc && doc.scrollLeft || body && body.scrollLeft || 0) -
              (doc && doc.clientLeft || body && body.clientLeft || 0);
            event.pageY = event.clientY +
              (doc && doc.scrollTop  || body && body.scrollTop  || 0) -
              (doc && doc.clientTop  || body && body.clientTop  || 0 );
        }
        // Use event.pageX / event.pageY here
        return { x: event.pageX, y: event.pageY }
}

(function() {
    var box = document.createElement('p-mouse-pointer');
    var styleElement = document.createElement('style');
    styleElement.innerHTML = " p-mouse-pointer { pointer-events: none; position: absolute; top: 0; z-index: 10000; left: 0; width: 20px; height: 20px; background: rgba(0,0,0,.4); border: 1px solid white; border-radius: 10px; box-sizing: border-box; margin: -10px 0 0 -10px; padding: 0; transition: background .2s, border-radius .2s, border-color .2s; } p-mouse-pointer.button-1 { transition: none; background: rgba(0,0,0,0.9); } p-mouse-pointer.button-2 { transition: none; border-color: rgba(0,0,255,0.9); } p-mouse-pointer.button-3 { transition: none; border-radius: 4px; } p-mouse-pointer.button-4 { transition: none; border-color: rgba(255,0,0,0.9); } p-mouse-pointer.button-5 { transition: none; border-color: rgba(0,255,0,0.9); } p-mouse-pointer-hide { display: none } ";
    document.head.appendChild(styleElement);
    document.body.appendChild(box);

    document.onmousemove = handleMouseMove;
    function handleMouseMove(event) {
        event = event || window.event; // IE-ism
        currentPos = getPosFromEvent(event);
        chrome.runtime.sendMessage({
            command: `sync_action`,
            data: { type: 'mousemove', ...currentPos }
        });
        box.style.left = String(event.pageX) + 'px';
        box.style.top = String(event.pageY) + 'px';
        box.classList.remove('p-mouse-pointer-hide');
    }

    document.onclick = handleMouseClick;
    function handleMouseClick(event){
        event = event || window.event; // IE-ism
        currentPos = getPosFromEvent(event);
        if(currentPos.x == 0 && currentPos.y == 0)
            return;
        chrome.runtime.sendMessage({
            command: `sync_action`,
            data: { type: 'click', ...currentPos }
        });
    }

    document.ondblclick = handleMouseDbClick;
    function handleMouseDbClick(event){
        event = event || window.event; // IE-ism
        currentPos = getPosFromEvent(event);
        chrome.runtime.sendMessage({
            command: `sync_action`,
            data: { type: 'dblclick', ...currentPos }
        });
    }
    document.onmouseover = handleMouseOver;
    function handleMouseOver(event){
        event = event || window.event; // IE-ism
        currentPos = getPosFromEvent(event);
        chrome.runtime.sendMessage({
            command: `sync_action`,
            data: { type: 'mouseover', ...currentPos }
        });
    }
})();