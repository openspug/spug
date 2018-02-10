<template>
    <el-dialog title="发布权限" :visible.sync="visible" @close="$emit('close')">
        <el-select v-model="type" style="margin-bottom: 15px">
            <el-option label="发布环境权限" value="env"></el-option>
            <el-option label="发布应用权限" value="app"></el-option>
        </el-select>
        <el-transfer :titles="['可选发布环境', '已分配环境']" v-if="type === 'env'" v-model="env_result" :data="envs"></el-transfer>
        <el-transfer :titles="['可选发布应用', '已分配应用']" v-if="type === 'app'" v-model="app_result" :data="apps"></el-transfer>
        <div slot="footer" v-if="has_permission('config_app_rel_edit')">
            <el-button @click="visible = false">取消</el-button>
            <el-button type="primary" @click="saveCommit" :loading="btnSaveLoading">保存</el-button>
        </div>
    </el-dialog>
</template>

<script>
    export default {
        props: ['role'],
        data() {
            return {
                visible: true,
                btnSaveLoading: false,
                type: 'env',
                env_result: [],
                app_result: [],
                apps: [],
                envs: []
            }
        },
        methods: {
            fetchApps() {
                this.$http.get('/api/deploy/apps/').then(res => {
                    for (let item of res.result) {
                        this.apps.push({
                            key: String(item.id),
                            label: item.name
                        })
                    }
                }, res => this.$layer_message(res.result))
            },
            fetchEnvs() {
                this.$http.get('/api/configuration/environments/').then(res => {
                    for (let item of res.result) {
                        this.envs.push({
                            key: String(item.id),
                            label: item.name
                        })
                    }
                }, res => this.$layer_message(res.result))
            },
            saveCommit() {
                this.btnSaveLoading = true;
                this.$http.post(`/api/account/roles/${this.role.id}/permissions/publish`, {app_ids: this.app_result, env_ids: this.env_result}).then(() => {
                    this.visible = false
                }, res => this.$layer_message(res.result)).finally(() => this.btnSaveLoading = false)
            }
        },
        mounted() {
            this.fetchApps();
            this.fetchEnvs();
            this.app_result = this.role.app_ids.split(',');
            this.env_result = this.role.env_ids.split(',')
        }
    }
</script>