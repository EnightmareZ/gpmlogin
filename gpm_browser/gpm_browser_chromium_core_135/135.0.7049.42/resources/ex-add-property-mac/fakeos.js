if(!window.BarcodeDetector)
    window.BarcodeDetector = {}; // fake macOS

setTimeout(() => {
    console.log('fake ok')
    const el = document.getElementById('webrtc-control-b')
    el.remove();
}, 200)