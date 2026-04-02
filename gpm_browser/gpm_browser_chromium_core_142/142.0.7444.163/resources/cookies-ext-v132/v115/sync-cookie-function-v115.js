'use strict';

const TOO_MUCH_COOKIES = 1000;

let isCookieChangeListenerOn = false;
let DELAY_SEND_COOKIE = 5000;
var _socket;
var _socketConnected = false;
var _currentProfileId = null;
const KEY_HISTORY_FILE_ID_RESTORE_COOKIE = 'id_restored_v115';

const END_POINT_CONVERT_COOKIE_RESULT = 'private/restore-cookie-done-event';

// Cookie mà thay đổi sẽ sync ngay
chrome.cookies.onChanged.addListener(() => {
    if (isCookieChangeListenerOn) {
        //
    }
});

// window.onbeforeunload = function (event) { log_info('onbeforeunload'); sendCookieToTool(); };

function buildCookieURL(domain, secure, path) {
    const domainWithoutDot = domain && domain.startsWith('.') ? domain.substr(1) : domain;
    return 'http' + (secure ? 's' : '') + '://' + domainWithoutDot + path;
}

function isHostOrSecure(cookieName) {
    return cookieName.startsWith('__Host-') || cookieName.startsWith('__Secure-');
}

function processSecureAndHost(cookie) {
    cookie.url = cookie.url.replace('http:', 'https:');
    cookie.secure = true;
    if (cookie.name.startsWith('__Host-')) {
        delete cookie.domain;
    }
}

function shouldSkipCookie(cookie) {
    const skipStrategies = [
        // Có lỗi của đầu bếp bị hỏng trên Gmail nếu bạn đặt cookie
        /(http|https):\/\/mail.google.com\//.test(cookie.url) && ['OSID', '__Secure-OSID'].includes(cookie.name),
        /(http|https):\/\/ads.google.com\//.test(cookie.url) && ['OSID'].includes(cookie.name),
        // cùng triển vọng.
        /(http|https):\/\/outlook.live.com/.test(cookie.url) && ['DefaultAnchorMailbox'].includes(cookie.name),
    ];

    return skipStrategies.some((strategy) => strategy);
}

function cleanCookieProperties(cookie) {
    delete cookie.browserType;
    delete cookie.storeId;

    if (cookie.session) {
        delete cookie.expirationDate;
    }
    delete cookie.session;

    // make host-only
    if (cookie.hostOnly || (cookie.domain && !cookie.domain.startsWith('.'))) {
        delete cookie.domain;
    }
    delete cookie.hostOnly;
}

function isValidDate(date) {
    return date instanceof Date && date.toString() !== 'Invalid Date';
}

function addDays(date, days) {
    const _date = new Date(Number(date));
    _date.setDate(date.getDate() + days);
    return _date;
}

function updateExpirationDate(cookie) {
    if (cookie.expirationDate) {
        if (/(http|https):\/\/mail.google.com\//.test(cookie.url) && cookie.name === 'COMPASS') {
            delete cookie.expirationDate;
            return;
        }

        const today = new Date();
        const _expirationDate = new Date(cookie.expirationDate * 1000);
        if (isValidDate(_expirationDate) && _expirationDate < today) {
            const plusThreeDays = addDays(today, 3);
            cookie.expirationDate = plusThreeDays.getTime() / 1000;
            return;
        }
    }
}

function setCookie(cookie) {
    return new Promise((resolve, reject) => {
        chrome.cookies.set(cookie, () => {
            if (chrome.runtime.lastError) {
                console.error('Cannot set cookie.' + chrome.runtime.lastError.message);
                resolve({ status: 'error', data: cookie, message: chrome.runtime.lastError.message });
            } else {
                resolve({ status: 'success', data: cookie });
            }
        });
    });
}

function setCookies(data) {
    if (data && Array.isArray(data)) {
        log_info('Set cookies...');

        const cookiePromises = [];
        const skipCookies = [];

        for (let cookie of data) {
            // for imported cookies
            if (!cookie.url) {
                cookie.url = buildCookieURL(cookie.domain, cookie.secure, cookie.path);
            }

            cleanCookieProperties(cookie);
            updateExpirationDate(cookie);

            if (isHostOrSecure(cookie.name)) {
                processSecureAndHost(cookie);
            }

            if (!shouldSkipCookie(cookie)) {
                cookiePromises.push(setCookie(cookie));
            } else {
                skipCookies.push(cookie);
            }
        }

        console.log('Skip cookies', skipCookies);

        return Promise.all(cookiePromises);
    }

    return Promise.resolve([]);
}

function sessionReady() {
    local.set('session_read', Date());
    log_info('Everything is ready');
}

function bptimer() {
    local.set('timer_update', Date());
}

function post_data_to_http_server_on_tool(url, body){
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    })
    .then(() => {
        log_info('sent status to server');
    })
    .catch((error) => console.error(`Failed post to ${url}: ${error.message}`));
}

function containCookie(targetArr, cookie) {
    return (
        // todo value
        targetArr.findIndex(({ domain, name, path, secure }) => {
            const cookieURL = buildCookieURL(domain, secure, path);
            return cookie.url === cookieURL && cookie.name === name && cookie.path === path;
        }) !== -1
    );
}

function diff(source, target) {
    return source.filter((cookie) => !containCookie(target, cookie));
}

function buildBaseUrl(path, port) {
    return `${path}:${port}`;
}

// async function sendCookieToTool(closeBrowser = true) {
//     sendCookieToToolOnDemand(); // 30.3.2023 mở lại gửi cookie để khi export cookie mà profile đang tắt
//     if (closeBrowser)
//         chrome.windows.gpmExit();
// }

// 29.3.2023 Để export cookie trên v111
async function sendCookieToToolOnDemand() {
    log_info('export_cookie...');
    chrome.cookies.getAll({}, (cookies) => {

        if (cookies.length > TOO_MUCH_COOKIES) DELAY_SEND_COOKIE = 10000; else DELAY_SEND_COOKIE = 5000;
        let cookiesBody = cookies.map(
            ({ domain, name, value, hostOnly, path, secure, httpOnly, sameSite, session, expirationDate = 0 }) => {
                const url = buildCookieURL(domain, secure, path);
                return { url, domain, name, value, hostOnly, path, secure, httpOnly, sameSite, session, expirationDate };
            }
        );
        // Global version
        let dataToSend_globalVersion = JSON.stringify({
            profile_id: config.gpm_profile_id,
            profile_path : config.profile_path,
            data: cookiesBody,
            file_cookie_save: config.file_cookie_save,
        });
        fetch(`${config.url_server}/api/v1/private/write-cookie-file`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: dataToSend_globalVersion,
        })
        .then(() => {
            log_info('sent cookies to server (Global version)');
        })
        .catch((error) => console.error(`Failed to sent cookie (Global version): ${error.message}`));
    });
}

// Khôi phục cookie từ file restore
function restoreCookieFromFile(gpm_data) {
    setInterval(bptimer, 5000);
    sessionReady();
    var data = gpm_data.cookies ?? gpm_data;

    console.log('start restore cookie');
    console.log('Cookies count from API ', data.length);

    chrome.cookies.getAll({}, async (cookies) => {
        const cookiesStats = {
            dbCookiesCount: data.length,
            chromeApiCount: cookies.length,
            cookiesDifferenceValues: [],
            uniqueDbCookies: [],
        };
        // Tìm cookie có trong db nhưng k có trên chrome
        if (data.length !== cookies.length) {
            // lấy cookie trong db so sánh với cookies hiện tại, xem cái nào chưa có gán vào uniqueDbCookie
            cookiesStats.uniqueDbCookies = data.filter((dbCookie) => cookies.findIndex(({ domain, name, path }) => dbCookie.domain === domain && dbCookie.name === name && dbCookie.path === path) === -1);
        }

        // Tìm cookie trong db khác chrome hiện tại
        data.forEach((dbCookie) => {
            const sameCookie = cookies.find(
                ({ domain, name, path }) => dbCookie.domain === domain && dbCookie.name === name && dbCookie.path === path
            );

            if (sameCookie && sameCookie.value !== dbCookie.value)
                cookiesStats.cookiesDifferenceValues.push({ db: dbCookie, chrome: sameCookie });
        });

        // => Được cookie cần update
        const diffCoookies = [...cookiesStats.uniqueDbCookies, ...cookiesStats.cookiesDifferenceValues.map(({ db }) => db)];

        // Vì cần đồng bộ cookie luôn nên phải tự load config
        let profile_id          = await gpm_get_profile_id();
        let user_data_dir       = await gpm_get_command_line_value('user-data-dir');
        const file_config_url   = await chrome.runtime.getURL('v115/gpm_config.json');
        let sync_config         = await fetch(file_config_url).then((response) => response.json());
        let file_cookie_save    = `${user_data_dir}\\Default\\GPMSoft\\Exporter\\TempCookies.json`;

        setCookies(diffCoookies).then(async (data) => {
            isCookieChangeListenerOn = true;

            console.log('data', data);
            console.log('error cookies', data.filter(({ status }) => status === 'error'));
            console.log('success cookies count', data.filter(({ status }) => status === 'success').length);

            const settledCookies = data.filter(({ status }) => status === 'success').map(({ data }) => data);
            console.log('success cookies', settledCookies);

            chrome.cookies.getAll({}, (cookies) => {
                console.log('chrome cookies count', cookies.length);
                console.log('cookies from chrome', cookies);
                console.log('diff', diff(settledCookies, cookies));
            });

            // 26.3.2023 Mở lại đoạn code này phục vụ v111 thay đổi cơ chế cookie => Thêm lịch sử Id đã import, nếu import file này rồi thì k import nữa
            var id_restored = local.get(KEY_HISTORY_FILE_ID_RESTORE_COOKIE);
            if (!id_restored)
              local.set(KEY_HISTORY_FILE_ID_RESTORE_COOKIE, []);
            id_restored.push(gpm_data.id);
            local.set(KEY_HISTORY_FILE_ID_RESTORE_COOKIE, id_restored);

            // Push thông báo qua tool
            post_data_to_http_server_on_tool(`${sync_config.url_server}/${END_POINT_CONVERT_COOKIE_RESULT}`, {
                    success: true,
                    gpm_profile_id: profile_id,
                    import_file_path: file_cookie_save,
            });
        })
        .catch((error) => {
            console.error(`Failed post to ${url}: ${error.message}`);
            post_data_to_http_server_on_tool(`${sync_config.url_server}/${END_POINT_CONVERT_COOKIE_RESULT}`, {
                success: false,
                gpm_profile_id: profile_id,
                file_cookie_save: file_cookie_save,
                error: error
        });
        });;
    });
}

async function restore_cookie_data() {
    // Khôi phục cookie từ dữ liệu truyền đến (sẽ được gọi từ background.js vì còn cần chờ load config)
    try {
        let cookie_restore_data_json = JSON.parse(await gpm_read_restore_cookie_data());
        if(cookie_restore_data_json) {
            var idRestored = local.get(KEY_HISTORY_FILE_ID_RESTORE_COOKIE);
            if (!idRestored) {
                idRestored = [];
                local.set(KEY_HISTORY_FILE_ID_RESTORE_COOKIE, []);
            }

            // Nếu chưa import mới import vào
            if (cookie_restore_data_json.id == null || idRestored.indexOf(cookie_restore_data_json.id) == -1) {
                log_info(`restoring TempCookies.json (id=${cookie_restore_data_json.id})...`);
                restoreCookieFromFile(cookie_restore_data_json);
            } else {
                log_info(`Skip TempCookies.json (id=${cookie_restore_data_json.id})`);
            }
        }
    }
    catch {
        console.error('error when restore TempCookies.json');
    }
}
restore_cookie_data();

function loop_sync_to_tool() {
    // Chỉ gửi cookie khi đã kết nối socket server
    if(config.socket_connected)
        sendCookieToToolOnDemand();

    debounce(loop_sync_to_tool, DELAY_SEND_COOKIE)();
}
loop_sync_to_tool();