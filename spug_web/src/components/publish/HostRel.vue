<template>
    <div>
        <el-select v-model="type" style="margin-bottom: 15px" placeholder="请选择环境">
            <el-option v-for="env in this.owner" :label="env.name" :value="env.id" :key="env.id">
            </el-option>
        </el-select>
                <el-transfer :titles="['未选主机', '已选主机']" v-if="type === ''" :data="ecs_host"></el-transfer>
                <el-transfer v-for="item in this.owner" :key="item.id" :titles="['未选主机', '已选主机']" v-if="type === item.id" v-model="app_result" :data="ecs_host"></el-transfer>
        <!--<el-transfer :titles="['未选主机', '已选主机']" v-if="type === 'app'" v-model="app_result" :data="apps"></el-transfer>-->
        <!--<el-transfer :titles="['未选主机', '已选主机']" v-if="type === 'service'" v-model="service_result" :data="services"></el-transfer>-->
        <div slot="footer" v-if="has_permission('config_app_rel_edit')">
            <el-button @click="visible = false">取消</el-button>
            <el-button type="primary" @click="saveCommit" :loading="btnSaveLoading">保存</el-button>
        </div>
    </div>
</template>

<script>
    export default {
        props: ['owner'],
        data () {
            return {
                visible: true,
                btnSaveLoading: false,
                type: '',
                app_result: [],
                service_result: [],
                apps: [],
                services: [],
                ecs_host: []
            }
        },
        methods: {
            get_ecs_host () {
                console.log('this.owner', this.owner);
                this.$http.get(`/api/assets/hosts/`,{params: {page: -1, host_query: {}}}).then(res => {
                    console.log('res.result.data', res.result.data);
                    for (let n of res.result.data){
                        const name = `${n.name} - ${n.ssh_ip}`;
                        this.ecs_host.push({
                            key:  n.id,
                            label: name,
                        })
                    }
                }, res => this.$layer_message(res.result)).finally(() => this.tableLoading = false)
            },

            // fetch_apps() {
            //     this.$http.get(`/api/deploy/apps/`).then(res => {
            //         for (let item of res.result) {
            //             if (item.id === this.owner.id) continue;
            //             this.apps.push({
            //                 key: item.id,
            //                 label: item.name,
            //                 disabled: false
            //             })
            //         }
            //     }, res => this.$layer_message(res.result))
            // },
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
            // this.fetch_apps();
            this.get_ecs_host();
            // this.fetch_services();
            // this.fetch_relationship()
        }
    }
</script>
