<template>
    <div>
        <el-dialog :title="owner.name" width="80%" :visible.sync="visible" @close="$emit('close')">
            <el-table :data="tableData" border style="width: 100%" v-loading="tableLoading">
                <el-table-column fixed prop="name" label="名称" min-width="250" :show-overflow-tooltip="true"></el-table-column>
                <el-table-column v-for="item in environments" :key="item.id" :label="item.name" :prop="'value.' + item.id" width="200px" :show-overflow-tooltip="true"></el-table-column>
                <el-table-column prop="desc" label="描述" min-width="300" :show-overflow-tooltip="true"></el-table-column>
                <el-table-column fixed="right" label="操作" width="160" v-if="has_permission('config_service_cfg_edit|config_service_cfg_del')">
                    <template slot-scope="scope">
                        <el-button v-if="has_permission('config_service_cfg_edit')" size="small" @click="editOpen(scope.row)">编辑</el-button>
                        <el-button v-if="has_permission('config_service_cfg_del')" size="small" type="danger" @click="delCommit(scope.row)" :loading="btnDelLoading[scope.row.id]">
                            删除
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
            <el-row style="text-align: right; margin-top: 15px" v-if="has_permission('config_service_cfg_add')">
                <el-button type="primary" @click="addOpen">新建配置</el-button>
            </el-row>
        </el-dialog>
        <el-dialog title="配置编辑" :visible.sync="dialogVisible">
            <el-form :model="cfgForm" label-width="80px" label-position="left">
                <el-form-item label="名称" required>
                    <el-input v-model="cfgForm.short_name" placeholder="请输入内容">
                        <template slot="prepend">{{ cfgForm.prefix }}</template>
                    </el-input>
                </el-form-item>
                <el-form-item label="描述" required>
                    <el-input v-model="cfgForm.desc" type="textarea" autosize placeholder="请输入内容"></el-input>
                </el-form-item>
                <el-form-item v-for="env in environments" :key="env.id" :label="env.name">
                    <el-input v-model="cfgForm.value[env.id]"></el-input>
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
                owner_type: 'ser',
                visible: true,
                tableLoading: false,
                btnDelLoading: false,
                btnSaveLoading: false,
                dialogVisible: false,
                tableData: [],
                cfgForm: this.init_cfgForm(),
                saveType: null
            }
        },
        methods: {
            init_cfgForm () {
                return {
                    name: '',
                    desc: '',
                    prefix: this.owner.identify.toUpperCase() + '_',
                    value: {}
                }
            },
            fetch () {
                this.tableLoading = true;
                this.$http.get(`/api/configuration/configs/${this.owner.id}?owner_type=${this.owner_type}`)
                    .then(res => {
                        this.tableData = res.result;
                    }, res => this.$layer_message(res.result)).finally(() => this.tableLoading = false)
            },
            addOpen () {
                this.saveType = '新建';
                this.cfgForm = this.init_cfgForm();
                this.dialogVisible = true
            },
            editOpen(row) {
                this.saveType = '编辑';
                this.cfgForm = this.$deepCopy(row);
                this.cfgForm.prefix = this.owner.identify.toUpperCase() + '_';
                this.cfgForm.short_name = this.cfgForm.name.replace(this.cfgForm.prefix, '');
                this.dialogVisible = true
            },
            saveCommit () {
                this.btnSaveLoading = true;
                let request;
                if (this.saveType === '新建') {
                    request = this.$http.post(`/api/configuration/configs/${this.owner.id}?owner_type=${this.owner_type}`, this.cfgForm)
                } else {
                    request = this.$http.put(`/api/configuration/configs/${this.cfgForm.id}`, this.cfgForm)
                }
                request.then(() => {
                        this.dialogVisible = false;
                        this.fetch();
                    }, res => this.$layer_message(res.result))
                    .finally(() => this.btnSaveLoading = false)
            },
            delCommit (row) {
                this.btnDelLoading = {[row.id]: true};
                this.$http.delete(`/api/configuration/configs/${row.id}`)
                    .then(() => this.fetch(), res => this.$layer_message(res.result))
                    .finally(() => this.btnDelLoading = {})
            }
        },
        created () {
            this.fetch()
        }
    }
</script>