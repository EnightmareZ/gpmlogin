'use strict';

function log_error(msg) {
    console.error(msg);
}

function log_info(...args) {
    console.log(Date(), ...args);
}

function debounce(func, timeMs) {
    let timeout;
    return function () {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(), timeMs);
    };
}