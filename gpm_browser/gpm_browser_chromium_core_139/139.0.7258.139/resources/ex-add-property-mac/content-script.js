const script = {};
console.log('load content script')
script.b = document.getElementById("gpm-inject-b");
const injectedCode = `
function inject_property(win) {
    if(!win.BarcodeDetector) win.BarcodeDetector = {}; // fake macOS
    
    // TEST START. Nhu nay khong duoc vi creepjs check trong frame
    // if(!win.sharedStorage) win.sharedStorage = {}
    // if(!win.Iterator) win.Iterator = {}
    // if(!win.GPM) win.GPM = {}
    // if(!win.fence) win.fence = {}
    // if(!win.Fence) win.Fence = {}
    // if(!win.FencedFrameConfig) win.FencedFrameConfig = {}
    // if(!win.HTMLFencedFrameElement) win.HTMLFencedFrameElement = {}
    // if(!win.SharedStorage) win.SharedStorage = {}
    // if(!win.SharedStorageWorklet) win.SharedStorageWorklet = {}
    // TEST END
}

inject_property(window)

document.querySelectorAll('iframe').forEach(frame => {
    try {
        // frame.contentWindow.test = "This is a test property injected by the Chrome extension";
        inject_property(frame.contentWindow)
    } catch (error) {
        console.error("Error injecting 'test' property into frame:", error);
    }
});

// TEST END 
setTimeout(() => {
    console.log('fake ok')
    const el = document.getElementById('gpm-inject-b')
    el.remove();
}, 100)
`;

if (!script.b) {
    script.b = document.createElement("script");
    script.b.type = "text/javascript";
    script.b.setAttribute("id", "gpm-inject-b");
    script.b.onload = function () {script.b.remove()};
    // script.b.src = chrome.runtime.getURL("fakeos.js");
    script.b.text = injectedCode;
    document.documentElement.appendChild(script.b);
    (document.head || document.documentElement).appendChild(script.b);
    console.log('content script added script')
}
