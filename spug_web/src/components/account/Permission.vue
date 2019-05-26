<template>
    <el-dialog :title="role.name + '- 权限管理'" :visible.sync="visible" @close="$emit('close')" width="80%"
               :close-on-click-modal="false">
        <table v-if="codes !== undefined" class="role_table">
            <tr class="el-table__row">
                <td rowspan="1">Dashboard</td>
                <td rowspan="1">Dashboard</td>
                <tag-td :item="codes['home_view']"></tag-td>
                <td></td>
                <td></td>
            </tr>
            <tr class="el-table__row">
                <td rowspan="4">用户管理</td>
                <td rowspan="2">用户列表</td>
                <tag-td :item="codes['account_user_view']"></tag-td>
                <tag-td :item="codes['account_user_add']"></tag-td>
                <tag-td :item="codes['account_user_edit']"></tag-td>
            </tr>
            <tr>
                <tag-td :item="codes['account_user_del']"></tag-td>
                <tag-td :item="codes['account_user_disable']"></tag-td>
                <td></td>
            </tr>
            <tr>
                <td rowspan="2">角色权限</td>
                <tag-td :item="codes['account_role_view']"></tag-td>
                <tag-td :item="codes['account_role_add']"></tag-td>
                <tag-td :item="codes['account_role_edit']"></tag-td>
            </tr>
            <tr>
                <tag-td :item="codes['account_role_del']"></tag-td>
                <tag-td :item="codes['account_role_permission_view']"></tag-td>
                <tag-td :item="codes['account_role_permission_edit']"></tag-td>
            </tr>
            <tr>
                <td rowspan="4">主机管理</td>
                <td rowspan="2">主机列表</td>
                <tag-td :item="codes['assets_host_view']"></tag-td>
                <tag-td :item="codes['assets_host_add']"></tag-td>
                <tag-td :item="codes['assets_host_edit']"></tag-td>
            </tr>
            <tr>
                <tag-td :item="codes['assets_host_del']"></tag-td>
                <tag-td :item="codes['assets_host_valid']"></tag-td>
                <td></td>
            </tr>
            <tr>
                <td rowspan="2">批量执行</td>
                <tag-td :item="codes['assets_host_exec_view']"></tag-td>
                <tag-td :item="codes['assets_host_exec']"></tag-td>
                <tag-td :item="codes['assets_host_exec_tpl_view']"></tag-td>
            </tr>
            <tr>
                <tag-td :item="codes['assets_host_exec_tpl_add']"></tag-td>
                <tag-td :item="codes['assets_host_exec_tpl_edit']"></tag-td>
                <tag-td :item="codes['assets_host_exec_tpl_del']"></tag-td>
            </tr>
            <tr>
                <td rowspan="14">应用发布</td>
                <td rowspan="5">应用列表</td>
                <tag-td :item="codes['publish_app_view']"></tag-td>
                <tag-td :item="codes['publish_app_add']"></tag-td>
                <tag-td :item="codes['publish_app_edit']"></tag-td>
            </tr>
            <tr>
                <tag-td :item="codes['publish_app_del']"></tag-td>
                <tag-td :item="codes['publish_app_publish_view']"></tag-td>
                <tag-td :item="codes['publish_app_ctr_view']"></tag-td>
            </tr>
            <tr>
                <tag-td :item="codes['publish_app_ctr_edit']"></tag-td>
                <tag-td :item="codes['publish_app_var_view']"></tag-td>
                <tag-td :item="codes['publish_app_var_add']"></tag-td>
            </tr>
            <tr>
                <tag-td :item="codes['publish_app_var_edit']"></tag-td>
                <tag-td :item="codes['publish_app_var_del']"></tag-td>
                <tag-td :item="codes['publish_app_menu_view']"></tag-td>
            </tr>
            <tr>
                <tag-td :item="codes['publish_app_menu_edit']"></tag-td>
                <td></td>
                <td></td>
            </tr>
            <tr>
                <td rowspan="2">发布页面</td>
                <tag-td :item="codes['publish_app_publish_host_select']"></tag-td>
                <tag-td :item="codes['publish_app_publish_ctr_control']"></tag-td>
                <tag-td :item="codes['publish_app_publish_ctr_del']"></tag-td>
            </tr>
            <tr>
                <tag-td :item="codes['publish_app_publish_deploy']"></tag-td>
                <tag-td :item="codes['publish_app_publish_menu_exec']"></tag-td>
                <td></td>
            </tr>
            <tr>
                <td rowspan="2">字段管理</td>
                <tag-td :item="codes['publish_field_view']"></tag-td>
                <tag-td :item="codes['publish_field_add']"></tag-td>
                <tag-td :item="codes['publish_field_edit']"></tag-td>
            </tr>
            <tr>
                <tag-td :item="codes['publish_field_del']"></tag-td>
                <tag-td :item="codes['publish_field_rel_view']"></tag-td>
                <tag-td :item="codes['publish_field_rel_edit']"></tag-td>
            </tr>
            <tr>
                <td :rowspan="2">菜单管理</td>
                <tag-td :item="codes['publish_menu_view']"></tag-td>
                <tag-td :item="codes['publish_menu_add']"></tag-td>
                <tag-td :item="codes['publish_menu_edit']"></tag-td>
            </tr>
            <tr>
                <tag-td :item="codes['publish_menu_del']"></tag-td>
                <tag-td :item="codes['publish_menu_rel_view']"></tag-td>
                <tag-td :item="codes['publish_menu_rel_edit']"></tag-td>
            </tr>
            <tr>
                <td rowspan="3">镜像管理</td>
                <tag-td :item="codes['publish_image_view']"></tag-td>
                <tag-td :item="codes['publish_image_sync']"></tag-td>
                <tag-td :item="codes['publish_image_edit']"></tag-td>
            </tr>
            <tr>
                <tag-td :item="codes['publish_image_del']"></tag-td>
                <tag-td :item="codes['publish_image_var_view']"></tag-td>
                <tag-td :item="codes['publish_image_var_add']"></tag-td>
            </tr>
            <tr>
                <tag-td :item="codes['publish_image_var_edit']"></tag-td>
                <tag-td :item="codes['publish_image_var_del']"></tag-td>
                <td></td>
            </tr>
            <tr>
                <td rowspan="8">配置管理</td>
                <td rowspan="2">环境管理</td>
                <tag-td :item="codes['config_environment_view']"></tag-td>
                <tag-td :item="codes['config_environment_add']"></tag-td>
                <tag-td :item="codes['config_environment_edit']"></tag-td>
            </tr>
            <tr>
                <tag-td :item="codes['config_environment_del']"></tag-td>
                <td></td>
                <td></td>
            </tr>
            <tr>
                <td rowspan="3">服务配置</td>
                <tag-td :item="codes['config_service_view']"></tag-td>
                <tag-td :item="codes['config_service_add']"></tag-td>
                <tag-td :item="codes['config_service_edit']"></tag-td>
            </tr>
            <tr>
                <tag-td :item="codes['config_service_del']"></tag-td>
                <tag-td :item="codes['config_service_cfg_view']"></tag-td>
                <tag-td :item="codes['config_service_cfg_add']"></tag-td>
            </tr>
            <tr>
                <tag-td :item="codes['config_service_cfg_edit']"></tag-td>
                <tag-td :item="codes['config_service_cfg_del']"></tag-td>
                <td></td>
            </tr>
            <tr>
                <td rowspan="3">应用配置</td>
                <tag-td :item="codes['config_app_view']"></tag-td>
                <tag-td :item="codes['config_app_cfg_view']"></tag-td>
                <tag-td :item="codes['config_app_cfg_add']"></tag-td>
            </tr>
            <tr>
                <tag-td :item="codes['config_app_cfg_edit']"></tag-td>
                <tag-td :item="codes['config_app_cfg_del']"></tag-td>
                <tag-td :item="codes['config_app_rel_view']"></tag-td>
            </tr>
            <tr>
                <tag-td :item="codes['config_app_rel_edit']"></tag-td>
                <td></td>
                <td></td>
            </tr>
            <tr>
                <td rowspan="2">任务管理</td>
                <td rowspan="2">任务列表</td>
                <tag-td :item="codes['job_task_view']"></tag-td>
                <tag-td :item="codes['job_task_add']"></tag-td>
                <tag-td :item="codes['job_task_edit']"></tag-td>
            </tr>
            <tr>
                <tag-td :item="codes['job_task_del']"></tag-td>
                <tag-td :item="codes['job_task_log']"></tag-td>
                <td></td>
            </tr>
            <tr>
                <td rowspan="1">系统管理</td>
                <td rowspan="1">通知设置</td>
                <tag-td :item="codes['system_notify_view']"></tag-td>
                <tag-td :item="codes['system_notify_add']"></tag-td>
                <tag-td :item="codes['system_notify_edit']"></tag-td>
            </tr>
        </table>
        <el-table v-else v-loading="loading"></el-table>
        <div slot="footer">
            <el-button @click="visible = false">取消</el-button>
            <el-button v-if="has_permission('account_role_permission_edit')" type="primary" @click="saveCommit" :loading="btnSaveLoading">保存</el-button>
        </div>
    </el-dialog>
</template>

<style>
    .role_table {
        width: 100%;
        background-color: #fff;
        border-collapse: collapse;
        border: 1px solid #dfe6ec;
        text-align: center;
        font-size: 14px;
        color: #1f2d3d
    }

    .role_table td {
        height: 40px;
        box-sizing: border-box;
        text-overflow: ellipsis;
        vertical-align: middle;
        border-bottom: 1px solid #dfe6ec;
        border-right: 1px solid #dfe6ec;
    }
</style>

<script>
    import TagTd from './TagTd.vue'

    export default {
        components: {
            'tag-td': TagTd
        },
        props: ['role'],
        data() {
            return {
                visible: true,
                loading: false,
                btnSaveLoading: false,
                codes: undefined
            }
        },
        methods: {
            fetch() {
                this.loading = true;
                this.$http.get(`/api/account/roles/${this.role.id}/permissions`).then(res => {
                    this.codes = res.result;
                }, res => this.$layer_message(res.result)).finally(() => this.loading = false)
            },
            saveCommit() {
                this.btnSaveLoading = true;
                let codes = [];
                for (let item of Object.values(this.codes)) {
                    if (item.is_has) {
                        codes.push(item.id)
                    }
                }
                this.$http.post(`/api/account/roles/${this.role.id}/permissions`, {codes: codes}).then(() => {
                    this.visible = false
                }, res => this.$layer_message(res.result)).finally(() => this.btnSaveLoading = false);
            }
        },
        mounted() {
            this.fetch()
        }
    }
</script>
