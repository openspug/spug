<template>
    <div>
        <el-row>
            <el-col :span="8">
                <el-select v-model="servers_group" @change="fetch()" placeholder="请选择分组">
                    <el-option v-for="item in groups" :key="item" :value="item"></el-option>
                </el-select>
            </el-col>
            <el-col :span="8" :offset="8" style="text-align: right">
                <el-button @click="fetch">刷新</el-button>
                <el-button v-if="has_permission('config_service_add')" type="primary" @click="addOpen">新建服务</el-button>
            </el-col>
        </el-row>
        <el-table :data="tableData" style="width: 100%; margin-top: 20px"  v-loading="tableLoading">
            <el-table-column label="分组" prop="group"></el-table-column>
            <el-table-column label="名称" prop="name"></el-table-column>
            <el-table-column label="标识" prop="identify"></el-table-column>
            <el-table-column label="描述" prop="desc" :show-overflow-tooltip="true"></el-table-column>
            <el-table-column lable="操作" width="220" v-if="has_permission('config_service_edit|config_service_del|config_service_cfg_view')">
                <template slot-scope="scope">
                    <el-button v-if="has_permission('config_service_edit')" size="small" @click="editOpen(scope.row)">编辑</el-button>
                    <el-button v-if="has_permission('config_service_cfg_view')" size="small" type="primary" @click="cfgOpen(scope.row)">配置</el-button>
                    <el-button v-if="has_permission('config_service_del')" size="small" type="danger" @click="delCommit(scope.row)" :loading="btnDelLoading[scope.row.id]">删除</el-button>
                </template>
            </el-table-column>
        </el-table>
        <el-dialog :title="saveType + '服务'" :visible.sync="dialogVisible" :close-on-click-modal="false">
            <el-form :model="form" label-width="80px" label-position="left">
                <el-form-item label="服务分组" required>
                    <el-select v-model="form.group" placeholder="选择服务分组">
                        <el-option v-for="g in groups" :value="g" :key="g"></el-option>
                    </el-select>
                    <el-button style="margin-left: 15px" type="text" @click="addGroup">添加分组</el-button>
                </el-form-item>
                <el-form-item label="名称" required>
                    <el-input v-model="form.name"></el-input>
                </el-form-item>
                <el-form-item label="标识" required>
                    <el-input v-model="form.identify"></el-input>
                </el-form-item>
                <el-form-item label="描述" required>
                    <el-input v-model="form.desc" type="textarea" autosize></el-input>
                </el-form-item>
            </el-form>
            <div slot="footer">
                <el-button @click="dialogVisible = false">取消</el-button>
                <el-button type="primary" @click="saveCommit" :loading="btnSaveLoading">保存</el-button>
            </div>
        </el-dialog>
        <service-config v-if="configVisible" :owner="form" :environments="environments" @close="configVisible = false"></service-config>
    </div>
</template>

<script>
    import ServiceConfig from "./ServiceConfig.vue";
    export default {
        components: {
            'service-config': ServiceConfig
        },
        data () {
            return {
                tableLoading: false,
                dialogVisible: false,
                configVisible: false,
                form: this.init_form(),
                environments: undefined,
                tableData: [],
                saveType: null,
                btnSaveLoading: false,
                btnDelLoading: false,
                servers_group: '',
                groups: [],
            }
        },
        methods: {
            init_form () {
                return {
                    name: '',
                    identify: '',
                    desc: '',
                    group: '',
                }
            },
            fetch () {
                this.tableLoading = true;
                let api_uri = '/api/configuration/services/';
                if (this.servers_group) api_uri += '?group=' + this.servers_group;
                this.$http.get(api_uri).then(res => {
                    this.tableData = res.result;
                },res => this.$layer_message(res.result)).finally(() => this.tableLoading = false);
            },

            fetchEnv () {
                this.$http.get('/api/configuration/environments/')
                    .then(res => {
                        this.environments = res.result
                    }, res => this.$layer_message(res.result));
            },
            fetchGroup(){
                this.$http.get('/api/configuration/services/groups/').then(res => {
                    this.groups = res.result
                }, res => this.$layer_message(res.result))
            },
            addOpen () {
                this.form = this.init_form();
                this.saveType = '新建';
                this.dialogVisible = true;
            },
            cfgOpen (row) {
                this.form = row;
                if (! this.environments) this.fetchEnv();
                this.configVisible = true;
            },
            editOpen (row) {
                this.form = this.$deepCopy(row);
                this.saveType = '编辑';
                this.dialogVisible = true;
            },
            saveCommit () {
                this.btnSaveLoading = true;
                let request;
                if (this.saveType === '新建') {
                    request = this.$http.post('/api/configuration/services/', this.form)
                } else {
                    request = this.$http.put(`/api/configuration/services/${this.form.id}`, this.form)
                }
                request.then(() => {
                    this.dialogVisible = false;
                    this.fetch();
                    this.fetchGroup();
                }, res => this.$layer_message(res.result)).finally(() => this.btnSaveLoading = false)
            },
            delCommit (row) {
                this.btnDelLoading = {[row.id]: true};
                this.$http.delete(`/api/configuration/services/${row.id}`)
                    .then(() => {
                        this.dialogVisible = false;
                        this.fetch()
                    }, res => this.$layer_message(res.result))
                    .finally(() => this.btnDelLoading = {})
            },
            addGroup () {
                this.$prompt('请输入新分组名称', '提示', {
                    inputPattern: /.+/,
                    inputErrorMessage: '请输入分组名称！'
                }).then(({value}) => {
                    this.form.group = value
                }).catch(() => {
                })
            },
        },
        created () {
            this.fetch()
            this.fetchGroup()
        }
    }
</script>