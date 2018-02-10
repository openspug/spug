<template>
    <div>
        <el-row style="text-align: right; margin-bottom: 15px">
            <el-button @click="fetch">刷新</el-button>
            <el-button v-if="has_permission('publish_field_add')" type="primary" @click="addOpen">添加字段</el-button>
        </el-row>
        <el-table :data="tableData" style="width: 100%" v-loading="tableLoading">
            <el-table-column prop="name" label="名称"></el-table-column>
            <el-table-column prop="desc" label="描述"></el-table-column>
            <el-table-column label="操作" width="220" v-if="has_permission('publish_field_edit|publish_field_del|publish_field_rel_view')">
                <template slot-scope="scope">
                    <el-button v-if="has_permission('publish_field_edit')" size="small" type="primary"
                               @click="editOpen(scope.row)">编辑
                    </el-button>
                    <el-button v-if="has_permission('publish_field_rel_view')" size="small" type="primary"
                               @click="relOpen(scope.row)">关联
                    </el-button>
                    <el-button v-if="has_permission('publish_field_del')" size="small" type="danger"
                               @click="delCommit(scope.row)"
                               :loading="btnDelLoading[scope.row.id]">删除
                    </el-button>
                </template>
            </el-table-column>
        </el-table>
        <el-dialog :visible.sync="dialogVisible" :close-on-click-modal="false">
            <el-form :model="form" label-width="80px">
                <el-form-item label="字段名称" required>
                    <el-input v-model="form.name" placeholder="请输入字段名称"></el-input>
                </el-form-item>
                <el-form-item label="字段描述">
                    <el-input type="textarea" autosize v-model="form.desc" placeholder="请输入字段描述"></el-input>
                </el-form-item>
                <el-form-item label="执行命令">
                    <color-input v-model="form.command"></color-input>
                </el-form-item>
            </el-form>
            <div slot="footer">
                <el-button @click="dialogVisible=false">取消</el-button>
                <el-button type="primary" @click="saveCommit" :loading="btnSaveLoading">保存</el-button>
            </div>
        </el-dialog>
        <el-dialog title="字段关联" :visible.sync="dialogRelVisible" :close-on-click-modal="false">
            <el-transfer :titles="['应用列表', '关联列表']" v-model="appRelResult" :data="apps"></el-transfer>
            <div slot="footer" v-if="has_permission('publish_field_rel_edit')">
                <el-button @click="dialogRelVisible = false">取消</el-button>
                <el-button type="primary" @click="saveRelCommit" :loading="btnSaveLoading">保存</el-button>
            </div>
        </el-dialog>
    </div>
</template>

<script>
    import ColorInput from './ColorInput.vue'

    export default {
        components: {
            'color-input': ColorInput
        },
        data() {
            return {
                tableLoading: false,
                btnSaveLoading: false,
                btnDelLoading: {},
                dialogVisible: false,
                dialogRelVisible: false,
                dialogTitle: '',
                tableData: [],
                appRelResult: [],
                apps: undefined,
                form: {}
            }
        },
        methods: {
            fetch() {
                this.tableLoading = true;
                this.$http.get('/api/deploy/fields/').then(res => {
                    this.tableData = res.result
                }, res => this.$layer_message(res.result)).finally(() => this.tableLoading = false)
            },
            fetchApps() {
                if (this.apps !== undefined) return;
                this.$http.get(`/api/deploy/apps/`).then(res => {
                    this.apps = res.result.map(x => {
                        return {key: x.id, label: x.name, disabled: false}
                    });
                }, res => this.$layer_message(res.result))
            },
            fetchBindApps() {
                this.$http.get(`/api/deploy/fields/${this.form.id}/apps`).then(res => {
                    this.appRelResult = res.result.map(x => x.id)
                }, res => this.$layer_message(res.result))
            },
            addOpen() {
                this.form = {};
                this.dialogTitle = '添加字段';
                this.dialogVisible = true;
            },
            editOpen(row) {
                this.form = this.$deepCopy(row);
                this.dialogTitle = '编辑字段';
                this.dialogVisible = true
            },
            relOpen(row) {
                this.form = row;
                this.fetchApps();
                this.fetchBindApps();
                this.dialogRelVisible = true;
            },
            delCommit(row) {
                this.$confirm(`此操作将永久删除 ${row.name}，是否继续？`, '删除确认', {type: 'warning'}).then(() => {
                    this.btnDelLoading = {[row.id]: true};
                    this.$http.delete(`/api/deploy/fields/${row.id}`).then(() => {
                        this.fetch()
                    }, res => this.$layer_message(res.result)).finally(() => this.btnDelLoading = false)
                }).catch(() => {
                })
            },
            saveCommit() {
                this.btnSaveLoading = true;
                let request;
                if (this.form.id) {
                    request = this.$http.put(`/api/deploy/fields/${this.form.id}`, this.form)
                } else {
                    request = this.$http.post('/api/deploy/fields/', this.form)
                }
                request.then(() => {
                    this.dialogVisible = false;
                    this.fetch()
                }, res => this.$layer_message(res.result)).finally(() => this.btnSaveLoading = false)
            },
            saveRelCommit() {
                this.btnSaveLoading = true;
                this.$http.post(`/api/deploy/fields/${this.form.id}/bind/apps`, {app_ids: this.appRelResult}).then(() => {
                    this.dialogRelVisible = false
                }, res => this.$layer_message(res.result)).finally(() => this.btnSaveLoading = false)
            }
        },
        created() {
            this.fetch()
        }
    }
</script>