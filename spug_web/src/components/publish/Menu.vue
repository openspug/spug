<template>
    <div>
        <el-row style="text-align: right; margin-bottom: 15px">
            <el-button @click="fetch">刷新</el-button>
            <el-button v-if="has_permission('publish_menu_add')" type="primary" @click="addOpen">添加菜单</el-button>
        </el-row>
        <el-table :data="tableData" style="width: 100%" v-loading="tableLoading">
            <el-table-column prop="name" label="名称"></el-table-column>
            <el-table-column prop="desc" label="描述"></el-table-column>
            <el-table-column label="操作" width="220"
                             v-if="has_permission('publish_menu_edit|publish_menu_del|publish_menu_rel_view')">
                <template slot-scope="scope">
                    <el-button v-if="has_permission('publish_menu_edit')" size="small" type="primary"
                               @click="editOpen(scope.row)">编辑
                    </el-button>
                    <el-button v-if="has_permission('publish_menu_rel_view')" size="small" type="primary"
                               @click="relOpen(scope.row)">关联
                    </el-button>
                    <el-button v-if="has_permission('publish_menu_del')" size="small" type="danger"
                               @click="delCommit(scope.row)"
                               :loading="btnDelLoading[scope.row.id]">删除
                    </el-button>
                </template>
            </el-table-column>
        </el-table>
        <el-dialog :visible.sync="dialogVisible" :close-on-click-modal="false">
            <el-form :model="form" label-width="80px" label-position="left">
                <el-form-item label="菜单名称">
                    <el-input v-model="form.name" placeholder="请输入菜单名称"></el-input>
                </el-form-item>
                <el-form-item label="菜单描述">
                    <el-input v-model="form.desc" type="textarea" placeholder="请输入菜单描述"></el-input>
                </el-form-item>
                <el-form-item label="显示位置">
                    <el-select v-model="form.position" placeholder="请选择">
                        <el-option label="发布区" :value="1"></el-option>
                        <el-option label="更多区" :value="2"></el-option>
                    </el-select>
                </el-form-item>
                <el-form-item label="命令内容">
                    <color-input v-model="form.command"></color-input>
                </el-form-item>
                <el-form-item label="需要参数">
                    <el-switch v-model="form.required_args"></el-switch>
                </el-form-item>
                <el-form-item label="操作确认">
                    <el-switch v-model="form.required_confirm"></el-switch>
                </el-form-item>
                <el-form-item label="展示方式">
                    <el-select v-model="form.display_type" placeholder="请选择">
                        <el-option label="实时输出" :value="1"></el-option>
                        <el-option label="反馈结果" :value="2"></el-option>
                    </el-select>
                </el-form-item>
            </el-form>
            <div slot="footer">
                <el-button @click="dialogVisible=false">取消</el-button>
                <el-button type="primary" @click="saveCommit" :loading="btnSaveLoading">保存</el-button>
            </div>
        </el-dialog>
        <el-dialog title="菜单关联" :visible.sync="dialogRelVisible" :close-on-click-modal="false">
            <el-transfer :titles="['应用列表', '关联列表']" v-model="appRelResult" :data="apps"></el-transfer>
            <div slot="footer" v-if="has_permission('publish_menu_rel_edit')">
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
            init_form () {
                return {
                    required_args: false,
                    required_confirm: false,
                    position: '',
                    display_type: ''
                }
            },
            fetch() {
                this.tableLoading = true;
                this.$http.get('/api/deploy/menus/').then(res => {
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
                this.$http.get(`/api/deploy/menus/${this.form.id}/apps`).then(res => {
                    this.appRelResult = res.result.map(x => x.id)
                }, res => this.$layer_message(res.result))
            },
            addOpen() {
                this.form = this.init_form();
                this.dialogTitle = '添加菜单';
                this.dialogVisible = true;
            },
            editOpen(row) {
                this.form = row;
                this.dialogTitle = '编辑菜单';
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
                    this.$http.delete(`/api/deploy/menus/${row.id}`).then(() => {
                        this.fetch()
                    }, res => this.$layer_message(res.result)).finally(() => this.btnDelLoading = false)
                }).catch(() => {
                })
            },
            saveCommit() {
                this.btnSaveLoading = true;
                let request;
                if (this.form.id) {
                    request = this.$http.put(`/api/deploy/menus/${this.form.id}`, this.form)
                } else {
                    request = this.$http.post('/api/deploy/menus/', this.form)
                }
                request.then(() => {
                    this.dialogVisible = false;
                    this.fetch()
                }, res => this.$layer_message(res.result)).finally(() => this.btnSaveLoading = false)
            },
            saveRelCommit() {
                this.btnSaveLoading = true;
                this.$http.post(`/api/deploy/menus/${this.form.id}/bind/apps`, {app_ids: this.appRelResult}).then(() => {
                    this.dialogRelVisible = false
                }, res => this.$layer_message(res.result)).finally(() => this.btnSaveLoading = false)
            }
        },
        created() {
            this.fetch()
        }
    }
</script>