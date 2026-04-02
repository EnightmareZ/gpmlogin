async function test(){
    let user_data_dir = await gpm_get_command_line_value('user-data-dir');
    const gpm_define_url = `file://${user_data_dir}/Default/gpm_define`;
    const gpm_define_data = await fetch(gpm_define_url).then((response) => response.json());
    alert('Profile ID: ' + gpm_define_data.id);
}
// test();

async function test2(){
    let profile_id = await gpm_get_profile_id();
    alert('Profile ID 2: ' + profile_id);
}
// test2();

async function test3(){
    let cookie_data = await gpm_read_restore_cookie_data();
    alert('cookie data: ' + cookie_data);
}
// test3();