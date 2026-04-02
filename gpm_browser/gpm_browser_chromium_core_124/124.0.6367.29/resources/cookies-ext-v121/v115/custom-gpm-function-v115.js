'use strict';

async function gpm_get_command_line_value(key) {
    try {
      let commandLineValue = await new Promise((resolve, reject) => {
        chrome.windows.gpmGetCommandLineValue(key, function(commandLineValue) {
          if (commandLineValue) {
            resolve(commandLineValue);
          } else {
            reject(new Error(`Command line ${key} not defined`));
          }
        });
      });
  
      // Use the commandLineValue here
      log_info('gpm_get_command_line_value: ', commandLineValue);
      return commandLineValue;
    } catch (error) {
      log_error(error.message);
      throw error; // or return a default value or handle the error appropriately
    }
}

async function gpm_get_profile_id() {
    try {
      let profileIdResult = await new Promise((resolve, reject) => {
        chrome.windows.gpmGetProfileId(function(profileId) {
          if (profileId) {
            resolve(profileId);
          } else {
            reject(new Error(`chrome.windows.gpmGetProfileId not defined`));
          }
        });
      });

      // Use the commandLineValue here
      log_info('gpm_get_profile_id:', profileIdResult);
      return profileIdResult;
    } catch (error) {
      log_error(error.message);
      throw error; // or return a default value or handle the error appropriately
    }
}

async function gpm_read_restore_cookie_data() {
    try {
      let cookieDataResult = await new Promise((resolve, reject) => {
        chrome.windows.gpmReadRestoreCookieData(function(cookieData) {
          if (cookieData) {
            resolve(cookieData);
          } else {
            reject(new Error(`Can not read cookie restore data`));
          }
        });
      });

      // Use the commandLineValue here
      log_info('Cookie:', cookieDataResult);
      return cookieDataResult;
    } catch (error) {
      log_error(error.message);
      throw error; // or return a default value or handle the error appropriately
    }
}