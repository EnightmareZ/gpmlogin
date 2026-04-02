'use strict';

var _socket;
var _socketConnected = false;
var _currentProfileId = null;
var _url_http_server = '';
var _url_socket_server = '';

function closeAllTab() {
    chrome.windows.gpmExit();
}

function send_data_to_socket(json_data){
    json_data.gpm_profile_id = _currentProfileId;

    if(_socketConnected){
        _socket.send(JSON.stringify(json_data));
    }else{
        log_error('Socket is not connect');
    }
}

function focus_window() {
    console.log("focus_window");
    chrome.windows.getLastFocused(
        { populate: false },
        function (currentWindow) {
            // Ẩn xong hiện luôn sau 100ms để focus
            chrome.windows.update(currentWindow.id, { state: "minimized" });
            debounce(() => {
                chrome.windows.update(currentWindow.id, { state: "maximized" });
                send_data_to_socket({
                    end_point: 'focus_window'
                });
            }, 100)();
        }
    );
}

// START Restore cookie
var has_restore_cookie = false;
async function restore_cookie(){
    // Mỗi lần chạy chỉ khôi phục cookie 1 lần
    if(has_restore_cookie)
        return;

    let cookie_data = await gpm_read_restore_cookie_data();
    if(cookie_data){
        await restore_cookie_data(cookie_data);
        has_restore_cookie = true;
    }
}
// END Restore cookie

// START process socket
function process_socket_response(response){
    let dataFromServer = JSON.parse(response.data);

    switch(dataFromServer.end_point){
        case 'focus_window':
            focus_window();
            break;
        case 'exit':
            closeAllTab();
            break;
        case 'error':
            log_error(JSON.stringify(dataFromServer));
            break;
        case 'sync_action':
            // code trong background-v115-sync-action.js
            send_data_to_active_tab({
                command: 'sync_action',
                data: dataFromServer.data
            });
            break;
    }
}

async function connect_socket_server() {
    if ("WebSocket" in window) {
        log_info('connect_socket_server...');
        // Lấy profile ID:
        let profile_id = await gpm_get_profile_id();
        // console.log(`profile_id=${profile_id}`)
        let user_data_dir = await gpm_get_command_line_value('user-data-dir');
        if(profile_id) {
            // Lấy thông tin server
            const file_config_url   = await chrome.runtime.getURL('v115/gpm_config.json');
            config                  = await fetch(file_config_url).then((response) => response.json());
            _currentProfileId       = profile_id;
            _url_http_server        = config.url_server;
            _url_socket_server      = config.websocket_server;

            // Gán các dữ liệu này để sử dụng sync cookie
            config.gpm_profile_id       = _currentProfileId;
            config.file_cookie_save = `${user_data_dir}\\Default\\GPMBrowserExtenions\\cookies-ext-new\\gpm_restore_cookie.json`;
            config.socket_connected = false;

            if(!config.websocket_server)
            {
                log_error('Not found websocket_server!');
                return;
            }
            _socket = new WebSocket(config.websocket_server);

            _socket.onopen = function () {
                log_info('connected socket server');
                config.socket_connected = _socketConnected = true;
                // Gửi dữ liệu thông báo để hiển thị trạng thái "Mở", "Đóng" trên tool
                send_data_to_socket({
                    end_point: 'hello',
                });
            };
            _socket.onclose = function () {
                config.socket_connected = _socketConnected = false;
                log_info('socket closed. Reconect after 1s');
                const debouncedConnectSocketServer = debounce(connect_socket_server, 1000);
                debouncedConnectSocketServer(); 
                // debounce(connect_socket_server, 1000);
            };
            _socket.onmessage = function (response) {
                log_info(JSON.stringify(response));
                process_socket_response(response);
            }
            _socket.onerror = function(err) {
                console.error('Socket encountered error: ', err.message, 'Closing socket');
                _socket.close(); // close xong sẽ tự connect lại (code trong hàm onclose)
            };
        } else {
            log_error('Can not get profile id');
        }
    } else {
      log_error("Browser not support WebSocket");
    }
}

connect_socket_server();

// END process socket