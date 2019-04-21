/**
 * Created by zyupo on 2017/04/20.
 * https://github.com/openspug/spug
 */
let menu = {
    menus: [
        {
            key: '/home', desc: 'Dashboard', icon: 'fa fa-desktop', permission: 'home_view',
        },
        {
            key: '1', desc: '用户管理', icon: 'fa fa-address-card', permission: 'account_user_view|account_role_view', subs: [
                {key: '/account/user', permission: 'account_user_view', desc: '用户列表'},
                {key: '/account/role', permission: 'account_role_view', desc: '角色权限'}
            ]
        }, {
            key: '2', desc: '主机管理', icon: 'fa fa-server', permission: 'assets_host_view|assets_host_exec_view', subs: [
                {key: '/assets/host', permission: 'assets_host_view', desc: '主机列表'},
                {key: '/assets/host_exec', permission: 'assets_host_exec_view', desc: '批量执行'}
            ]
        }, {
            key: '3', desc: '应用发布', icon: 'fa fa-flag-o', permission: 'publish_app_view|publish_image_view', subs: [
                {key: '/publish/app', permission: 'publish_app_view', desc: '应用列表'},
                {key: '/publish/field', permission: 'publish_field_view', desc: '字段管理'},
                {key: '/publish/menu', permission: 'publish_menu_view', desc: '菜单管理'},
                {key: '/publish/image', permission: 'publish_image_view', desc: '镜像管理'}
            ]
        }, {
            key: '4', desc: '配置管理', icon: 'fa fa-cogs', permission: 'config_environment_view|config_service_view|config_app_view', subs: [
                {key: '/configuration/environment', permission: 'config_environment_view', desc: '环境管理'},
                {key: '/configuration/service', permission: 'config_service_view', desc: '服务配置'},
                {key: '/configuration/app', permission: 'config_app_view', desc: '应用配置'},
                {key: '/configuration/relationship', permission: 'config_app_view', desc: '配置关系'}
            ]
        }, {
            key: '5', desc: '任务管理', icon: 'fa fa-calendar', permission: 'job_task_view', subs: [
                {key: '/schedule/job', permission: 'job_task_view', desc: '任务列表'}
            ]
        }, {
            key: '6', desc: '监控管理', icon: 'fa fa-tachometer', subs: [
                {key: 'host_monitor', desc: '主机监控'},
                {key: 'ser_monitor', desc: '服务监控'},
                {key: 'site_monitor', desc: '站点监控'},
            ]
        },
        {
            key: '7', desc: '告警管理', icon: 'fa fa-bell-o', subs: [
                {key: 'alarm_role', desc: '报警规则'},
                {key: 'alarm_contact', desc: '报警联系人'},
            ]
        },
        {
            key: '8', desc: '系统管理', icon: 'el-icon-setting',  permission: 'system_notify_view',  subs: [
                {key: '/system/notify', permission: 'system_notify_view', desc: '通知设置'},
            ]
        },
    ]
};

export default menu;
