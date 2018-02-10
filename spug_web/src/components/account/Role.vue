<template>
    <div>
        <el-row style="text-align: right; margin-bottom: 15px">
            <el-button @click="fetch(true)">刷新</el-button>
            <el-button v-if="has_permission('account_role_add')" type="primary" @click="addOpen">添加角色</el-button>
        </el-row>
        <el-table :data="tableData" v-loading="tableLoading" style="width: 100%; margin-top: 20px">
            <el-table-column prop="name" label="名称" min-width="100"></el-table-column>
            <el-table-column prop="desc" label="描述" show-overflow-tooltip></el-table-column>
            <el-table-column label="操作" width="300">
                <template slot-scope="scope">
                    <el-button v-if="has_permission('account_role_edit')" size="small" @click="editOpen(scope.row)">编辑</el-button>
                    <el-button v-if="has_permission('account_role_permission_view')" size="small" type="primary" @click="perOpen(scope.row)">权限</el-button>
                    <el-button v-if="has_permission('account_role_permission_view')" size="small" type="primary" @click="pubPerOpen(scope.row)">发布</el-button>
                    <el-button v-if="has_permission('account_role_del')" size="small" type="danger" :loading="btnDelLoading[scope.row.id]" @click="delCommit(scope.row)">删除</el-button>
                </template>
            </el-table-column>
        </el-table>
        <el-dialog title="编辑角色" :visible.sync="dialogEditVisible" :close-on-click-modal="false">
            <el-form :model="form" label-width="80px">
                <el-form-item label="角色名称" required>
                    <el-input v-model="form.name" placeholder="请输入角色名称"></el-input>
                </el-form-item>
                <el-form-item label="角色描述">
                    <el-input type="textarea" autosize v-model="form.desc" placeholder="请输入角色描述"></el-input>
                </el-form-item>
            </el-form>
            <div slot="footer">
                <el-button @click="dialogEditVisible=false">取消</el-button>
                <el-button type="primary" @click="saveCommit" :loading="btnSaveLoading">保存</el-button>
            </div>
        </el-dialog>
        <permission v-if="dialogPerVisible" :role="form" @close="dialogPerVisible = false"></permission>
        <publish-permission v-if="dialogPubPerVisible" :role="form" @close="dialogPubPerVisible = false"></publish-permission>
    </div>
</template>

<script>
    import Permission from './Permission.vue'
    import PublishPermission from './PublishPermission.vue'
    export default {
        components: {
            PublishPermission,
            permission: Permission,
        },
        data() {
            return {
                tableLoading: false,
                btnSaveLoading: false,
                btnDelLoading: {},
                dialogPerVisible: false,
                dialogEditVisible: false,
                dialogPubPerVisible: false,
                tableData: [],
                form: {}
            }
        },
        methods: {
            fetch() {
                this.tableLoading = true;
                this.$http.get('/api/account/roles/').then(res => {
                    this.tableData = res.result
                }, res => this.$layer_message(res.result)).finally(() => this.tableLoading = false)
            },
            addOpen() {
                this.form = {};
                this.dialogEditVisible = true
            },
            editOpen(row) {
                this.form = row;
                this.dialogEditVisible = true
            },
            perOpen(row) {
                this.form = row;
                this.dialogPerVisible = true
            },
            pubPerOpen(row) {
                this.form = row;
                this.dialogPubPerVisible = true;
            },
            saveCommit() {
                this.btnSaveLoading = true;
                let request;
                if (this.form.id) {
                    request = this.$http.put(`/api/account/roles/${this.form.id}`, this.form)
                } else {
                    request = this.$http.post('/api/account/roles/', this.form)
                }
                request.then(() => {
                    this.dialogEditVisible = false;
                    this.$layer_message('提交成功', 'success');
                    this.fetch()
                }, res => this.$layer_message(res.result)).finally(() => this.btnSaveLoading = false)
            },
            delCommit(row) {
                this.$confirm(`此操作将永久删除角色 ${row.name}，是否继续？`, '删除确认', {type: 'warning'}).then(() => {
                    this.btnDelLoading = {[row.id]: true};
                    this.$http.delete(`/api/account/roles/${row.id}`).then(() => {
                        this.fetch()
                    }, res => this.$layer_message(res.result))
                }).catch(() => {
                }).finally(() => this.btnDelLoading = {})
            }
        },
        created() {
            this.fetch()
        }
    }
</script>