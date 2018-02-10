<template>
    <div>
        <el-dialog title="容器设置" width="80%" :visible.sync="visible" @close="$emit('close')"
                   :close-on-click-modal="false">
            <el-table :data="tableData" v-loading="tableLoading.length < 2" border style="width: 100%">
                <el-table-column fixed prop="desc" label="名称" width="150px"></el-table-column>
                <el-table-column v-for="item in this.environments" :key="item.id" :label="item.name" show-overflow-tooltip>
                    <template slot-scope="scope">
                        <span v-if="scope.row.value[item.id]">{{scope.row.value[item.id]}}</span>
                        <span v-else style="color: #D3DCE6">{{scope.row.tip}}</span>
                    </template>
                </el-table-column>
                <el-table-column fixed="right" label="操作" width="80px" v-if="has_permission('publish_app_ctr_edit')">
                    <template slot-scope="scope">
                        <el-button size="small" type="primary"
                                   @click="form = $deepCopy(scope.row); dialogVisible = true">编辑
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
        </el-dialog>
        <el-dialog :title="`设置 - ${form.desc}`" :visible.sync="dialogVisible" :close-on-click-modal="false">
            <el-form :model="form" label-width="80px" label-position="left">
                <el-form-item v-for="env in this.environments" :key="env.id" :label="env.name">
                    <el-input v-model="form.value[env.id]" :placeholder="form.tip"></el-input>
                </el-form-item>
            </el-form>
            <div slot="footer">
                <el-button @click="dialogVisible = false">取消</el-button>
                <el-button type="primary" @click="saveCommit" :loading="btnSaveLoading">保存</el-button>
            </div>
        </el-dialog>
    </div>
</template>


<script>
    export default {
        props: ['owner', 'environments'],
        data () {
            return {
                visible: true,
                tableLoading: false,
                dialogVisible: false,
                btnSaveLoading: false,
                tableData: [
                    {value: {}, desc: '限制内存', name: '__MEM_LIMIT', tip: '无限制'},
                    {value: {}, desc: '网络模式', name: '__NETWORK_MODE', tip: 'default'},
                    {value: {}, desc: '映射端口', name: '__EXPOSE_PORT', tip: '示例：127.0.0.1:80:3000'},
                    {value: {}, desc: '映射目录', name: '__BIND_VOLUME', tip: '示例：/home/user1:/mnt/vol1:ro'},
                    {value: {}, desc: 'DNS地址', name: '__DNS_SERVER', tip: '8.8.8.8;4.4.4.4'},
                    {value: {}, desc: '主机名称', name: '__HOST_NAME', tip: '随机名称'}
                ],
                form: {
                    value: {}
                }
            }
        },
        methods: {
            fetch () {
                this.tableLoading = true;
                this.$http.get(`/api/configuration/configs/${this.owner.id}?owner_type=app&cfg_type=system`).then(res => {
                    for (let item of this.tableData) {
                        for (let e of res.result) {
                            if (e.name === item.name) {
                                this.$set(item, 'value', e.value);
                                break
                            }
                        }
                    }
                }, res => this.$layer_message(res.result)).finally(() => this.tableLoading = false)
            },
            saveCommit () {
                this.btnSaveLoading = true;
                this.$http.post(`/api/deploy/configs/app/${this.owner.id}/settings/`, this.form).then(() => {
                    this.dialogVisible = false;
                    this.fetch()
                }, res => this.$layer_message(res.result)).finally(() => this.btnSaveLoading = false)
            }
        },
        created () {
            this.fetch()
        }
    }
</script>