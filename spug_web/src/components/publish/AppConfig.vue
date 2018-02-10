<template>
    <div>
        <el-dialog :title="`应用设置 - ${owner.name}`" width="80%" :visible.sync="visible" :close-on-click-modal="false"
                   @close="$emit('close')">
            <el-table :data="tableData" border style="width: 100%" v-loading="tableLoading">
                <el-table-column fixed prop="name" label="名称" min-width="250" show-overflow-tooltip></el-table-column>
                <el-table-column v-for="item in environments" :key="item.id" :label="item.name"
                                 :prop="'value.' + item.id" width="200px" show-overflow-tooltip></el-table-column>
                <el-table-column prop="desc" label="描述" min-width="200" show-overflow-tooltip></el-table-column>
                <el-table-column fixed="right" label="操作" width="160" v-if="has_permission('publish_app_var_edit|publish_app_var_del')">
                    <template slot-scope="scope">
                        <el-button v-if="has_permission('publish_app_var_edit')" size="small" @click="editOpen(scope.row)">编辑</el-button>
                        <el-button v-if="has_permission('publish_app_var_del')" size="small" type="danger" @click="delCommit(scope.row)"
                                   :loading="btnDelLoading[scope.row.id]">
                            删除
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
            <div slot="footer">
                <el-button @click="visible = false">关闭</el-button>
                <el-button v-if="has_permission('publish_app_var_add')" type="primary" @click="addOpen">新建</el-button>
            </div>
        </el-dialog>
        <el-dialog title="编辑配置" :visible.sync="dialogVisible" :close-on-click-modal="false">
            <el-form :model="form" label-width="80px" label-position="left">
                <el-form-item label="名称" required>
                    <el-input v-model="form.name" placeholder="请输入变量名称"></el-input>
                </el-form-item>
                <el-form-item label="描述" required>
                    <el-input v-model="form.desc" type="textarea" placeholder="请输入变量描述"></el-input>
                </el-form-item>
                <el-form-item v-for="env in environments" :key="env.id" :label="env.name">
                    <el-input v-model="form.value[env.id]" placeholder="请输入内容"></el-input>
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
                owner_type: 'app',
                cfg_type: 'system',
                visible: true,
                tableLoading: false,
                btnDelLoading: false,
                btnSaveLoading: false,
                dialogVisible: false,
                tableData: [],
                form: this.init_form(),
            }
        },
        methods: {
            init_form () {
                return {
                    name: '',
                    desc: '',
                    value: {}
                }
            },
            fetch () {
                this.tableLoading = true;
                this.$http.get(`/api/deploy/configs/app/${this.owner.id}`).then(res => {
                    this.tableData = res.result;
                }, res => this.$layer_message(res.result)).finally(() => this.tableLoading = false)
            },
            addOpen () {
                this.form = this.init_form();
                this.dialogVisible = true
            },
            editOpen(row) {
                this.form = this.$deepCopy(row);
                this.dialogVisible = true
            },
            delCommit (row) {
                this.btnDelLoading = {[row.id]: true};
                this.$http.delete(`/api/configuration/configs/${row.id}`)
                    .then(() => this.fetch(), res => this.$layer_message(res.result))
                    .finally(() => this.btnDelLoading = {})
            },
            saveCommit () {
                this.btnSaveLoading = true;
                let request;
                if (this.form.id) {
                    request = this.$http.put(`/api/deploy/configs/app/${this.form.id}`, this.form)
                } else {
                    request = this.$http.post(`/api/deploy/configs/app/${this.owner.id}`, this.form)
                }
                request.then(() => {
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