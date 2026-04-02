'use strict';

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}

const specials = [
    {character:';', code_name: 'Semicolon'},
    {character:',', code_name: 'Comma'},
    {character:'[', code_name: 'BracketLeft'},
    {character:']', code_name: 'BracketRight'},
    {character:'\\', code_name: 'Backslash'},
    {character:'/', code_name: 'Slash'},
    {character:'\'', code_name: 'Quote'},
    {character:'.', code_name: 'Period'},
    {character:'-', code_name: 'Minus'},
    {character:'=', code_name: 'Equal'},
    {character:'`', code_name: 'Backquote'},
];
const specials_have_shift = [
    {character:':', code_name: 'Semicolon'},
    {character:'<', code_name: 'Comma'},
    {character:'{', code_name: 'BracketLeft'},
    {character:'}', code_name: 'BracketRight'},
    {character:'|', code_name: 'Backslash'},
    {character:'?', code_name: 'Slash'},
    {character:'"', code_name: 'Quote'},
    {character:'>', code_name: 'Period'},
    {character:'_', code_name: 'Minus'},
    {character:'+', code_name: 'Equal'},
    {character:'~', code_name: 'Backquote'},
    {character:'!', code_name: 'Digit1'},
    {character:'@', code_name: 'Digit2'},
    {character:'#', code_name: 'Digit3'},
    {character:'$', code_name: 'Digit4'},
    {character:'%', code_name: 'Digit5'},
    {character:'^', code_name: 'Digit6'},
    {character:'&', code_name: 'Digit7'},
    {character:'*', code_name: 'Digit8'},
    {character:'(', code_name: 'Digit9'},
    {character:')', code_name: 'Digit0'},
];

/**
 * Insert the text at the cursor into the active element. Note that we're
 * intentionally not appending or simply replacing the value of the editable
 * field, as we want to allow normal pasting conventions. If you paste at the
 * beginning, you shouldn't see all your text be replaced.
 * Taken from:
 * http://stackoverflow.com/questions/7404366/how-do-i-insert-some-text-where-the-cursor-is
 */
async function insertTextAtCursor(text, config) {
    // console.log('insertTextAtCursor');
    var el = document.activeElement;
    // const config_file_url = await chrome.runtime.getURL('config.json');
    // const config = await fetch(config_file_url).then((response) => response.json());
    let current_total_delay = 0;
    for (var i = 0; i < text.length; i++) {
        let char_next = text.charAt(i);
        let delay = getRandomInt(config.delay_from, config.delay_to);
        current_total_delay += delay;
        // console.log(`Delay: ${delay}, total delay: ${current_total_delay}`);
        setTimeout(function(){insert_char_to_element(el, char_next)}, current_total_delay);
    }
}

function fire_keyboard_shift_event(el, name_event){
    el.dispatchEvent(new KeyboardEvent(name_event, {
        key: 'Shift',
        code: 'ShiftLeft',
        keyCode: 16,
        which: 16,
        shiftKey: true,
        ctrlKey: false,
        metaKey: false
    }));
}

function fire_keyboard_event(el, name_event, text){//keydown, keypress
    let keyCode = text.charCodeAt(0);
    // var keyboardEvent = document.createEvent("KeyboardEvent");
    // var initMethod = typeof keyboardEvent.initKeyboardEvent !== 'undefined' ? "initKeyboardEvent" : "initKeyEvent";
    // keyboardEvent[initMethod](
    //     name_event, // event type : keydown, keyup, keypress
    //     true, // bubbles
    //     true, // cancelable
    //     window, // viewArg: should be window
    //     false, // ctrlKeyArg
    //     false, // altKeyArg
    //     false, // shiftKeyArg
    //     false, // metaKeyArg
    //     keyCode, // keyCodeArg : unsigned long the virtual key code, else 0
    //     0 // charCodeArgs : unsigned long the Unicode character associated with the depressed key, else 0
    // );
    //el.dispatchEvent(keyboardEvent);

    let prefix_code = 'Key';
    if(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(text))
        prefix_code = 'Digit';
    let key_data = {
        key: '',
        code: '',
        keyCode: keyCode,
        which: keyCode,
        shiftKey: false,
        ctrlKey: false,
        metaKey: false
    };
    key_data.code = `${prefix_code}${text.toUpperCase()}`;
    
    let special_index = specials.findIndex(p => p.character == text);
    if(special_index != -1){
        key_data.code = specials[special_index].code_name;
    }
    let special_index_shift = specials_have_shift.findIndex(p => p.character == text);
    if(special_index_shift != -1){
        key_data.code = specials_have_shift[special_index_shift].code_name;
        key_data.shiftKey = true;
        if(name_event == 'keydown')
            fire_keyboard_shift_event(el, 'keydown');
    }
    key_data.key = text;

    el.dispatchEvent(new KeyboardEvent(name_event, key_data));
}

function insert_char_to_element(el, text){
    // console.log(`insert ${text}`);
    var val = el.value || el.textContent;
    var endIndex;
    var range;
    var doc = el.ownerDocument;

    fire_keyboard_event(el, 'keydown', text);
    fire_keyboard_event(el, 'keypress', text);

    if (typeof el.selectionStart === 'number' &&
        typeof el.selectionEnd === 'number') {
        endIndex = el.selectionEnd;
        el.value = val.slice(0, endIndex) + text + val.slice(endIndex);
        el.selectionStart = el.selectionEnd = endIndex + text.length;

        fire_keyboard_event(el, 'keyup', text);
        if(specials_have_shift.findIndex(p => p.character == text) != -1)
            fire_keyboard_shift_event(el, 'keyup');
    } else if (doc.selection !== 'undefined' && (doc?.selection?.createRange || false)) {
        el.focus();
        range = doc.selection.createRange();
        range.collapse(false);
        range.text = text;
        range.select();

        fire_keyboard_event(el, 'keyup', text);
        if(specials_have_shift.findIndex(p => p.character == text) != -1)
            fire_keyboard_shift_event(el, 'keyup');
    }
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.data) {
        insertTextAtCursor(request.data, request.config);
    }
});