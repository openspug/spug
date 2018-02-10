<template>
    <el-dialog title="配置关系" :visible.sync="visible" @close="$emit('close')">
        <el-select v-model="type" style="margin-bottom: 15px">
            <el-option label="应用关系" value="app"></el-option>
            <el-option label="服务关系" value="service"></el-option>
        </el-select>
        <el-transfer :titles="['应用列表', '关联列表']" v-if="type === 'app'" v-model="app_result" :data="apps"></el-transfer>
        <el-transfer :titles="['服务列表', '关联列表']" v-if="type === 'service'" v-model="service_result" :data="services"></el-transfer>
        <div slot="footer" v-if="has_permission('config_app_rel_edit')">
            <el-button @click="visible = false">取消</el-button>
            <el-button type="primary" @click="saveCommit" :loading="btnSaveLoading">保存</el-button>
        </div>
    </el-dialog>
</template>

<script>
    export default {
        props: ['owner'],
        data () {
            return {
                visible: true,
                btnSaveLoading: false,
                type: 'app',
                app_result: [],
                service_result: [],
                apps: [],
                services: []
            }
        },
        methods: {
            fetch_apps() {
                this.$http.get(`/api/deploy/apps/`).then(res => {
                    for (let item of res.result) {
                        if (item.id === this.owner.id) continue;
                        this.apps.push({
                            key: item.id,
                            label: item.name,
                            disabled: false
                        })
                    }
                }, res => this.$layer_message(res.result))
            },
            fetch_services() {
                this.$http.get(`/api/configuration/services/`).then(res => {
                    for (let item of res.result) {
                        this.services.push({
                            key: item.id,
                            label: item.name,
                            disabled: false
                        })
                    }
                }, res => this.$layer_message(res.result))
            },
            fetch_relationship () {
                this.$http.get(`/api/configuration/apps/${this.owner.id}/bind/relationship`).then(res => {
                    if (res.result.hasOwnProperty('app_ids')) this.app_result = res.result['app_ids'];
                    if (res.result.hasOwnProperty('service_ids')) this.service_result = res.result['service_ids']
                }, res => this.$layer_message(res.result))
            },
            saveCommit () {
                this.btnSaveLoading = true;
                this.$http.post(`/api/configuration/apps/${this.owner.id}/bind/relationship`, {
                    app_ids: this.app_result,
                    service_ids: this.service_result
                }).then(res => this.visible = false, res => this.$layer_message(res.result)).finally(() => this.btnSaveLoading = false)
            }
        },
        created () {
            this.fetch_apps();
            this.fetch_services();
            this.fetch_relationship()
        }
    }
</script>