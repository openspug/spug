<template>
    <div>
        <el-row style="margin-bottom: 15px; text-align: right">
            <el-button @click="fetch">刷新</el-button>
            <el-button v-if="has_permission('config_environment_add')" type="primary" @click="addOpen">新建环境</el-button>
        </el-row>
        <el-table :data="tableData" stripe style="width: 100%" v-loading="tableLoading">
            <el-table-column prop="name" label="名称"></el-table-column>
            <el-table-column prop="identify" label="标识"></el-table-column>
            <el-table-column prop="priority" label="优先级"></el-table-column>
            <el-table-column prop="desc" label="描述" :show-overflow-tooltip="true"></el-table-column>
            <el-table-column label="操作" width="160" v-if="has_permission('config_environment_edit|config_environment_del')">
                <template slot-scope="scope">
                    <el-button v-if="has_permission('config_environment_edit')" size="small" @click="editOpen(scope.row)">编辑</el-button>
                    <el-button v-if="has_permission('config_environment_del')" size="small" type="danger" @click="delCommit(scope.row)"
                               :loading="btnDelLoading[scope.row.id]">删除
                    </el-button>
                </template>
            </el-table-column>
        </el-table>
        <el-dialog title="编辑环境" :visible.sync="dialogVisible" :close-on-click-modal="false">
            <el-form :model="form" label-width="80px" label-position="left">
                <el-form-item label="名称" required>
                    <el-input v-model="form.name"></el-input>
                </el-form-item>
                <el-form-item label="标识" required>
                    <el-input v-model="form.identify"></el-input>
                </el-form-item>
                <el-form-item label="优先级" required>
                    <el-input v-model="form.priority"></el-input>
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
    </div>
</template>

<script>
    export default {
        data () {
            return {
                tableLoading: false,
                btnSaveLoading: false,
                btnDelLoading: {},
                tableData: [],
                form: this.init_form(),
                dialogVisible: false
            }
        },
        methods: {
            init_form () {
                return {
                    name: '',
                    identify: '',
                    desc: '',
                    priority: ''
                }
            },
            fetch () {
                this.tableLoading = true;
                this.$http.get('/api/configuration/environments/')
                    .then(res => {
                        this.tableData = res.result
                    }, res => this.$layer_message(res.result))
                    .finally(() => this.tableLoading = false)
            },
            addOpen () {
                this.form = this.init_form();
                this.dialogVisible = true;
            },
            editOpen (row) {
                this.form = this.$deepCopy(row);
                this.dialogVisible = true;
            },
            saveCommit () {
                this.btnSaveLoading = true;
                let request;
                if (this.form.id) {
                    request = this.$http.put(`/api/configuration/environments/${this.form.id}`, this.form)
                } else {
                    request = this.$http.post('/api/configuration/environments/', this.form)
                }
                request.then(() => {
                    this.dialogVisible = false;
                    this.fetch()
                }, res => this.$layer_message(res.result))
                    .finally(() => {
                        this.btnSaveLoading = false
                    })
            },
            delCommit (row) {
                this.btnDelLoading = {[row.id]: true};
                this.$http.delete(`/api/configuration/environments/${row.id}`)
                    .then(() => this.fetch(), res => this.$layer_message(res.result))
                    .finally(() => this.btnDelLoading = {})
            }
        },
        created () {
            this.fetch()
        }
    }
</script>