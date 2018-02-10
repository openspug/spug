<template>
    <div>
        <el-dialog title="菜单管理" width="80%" :visible.sync="visible" :close-on-click-modal="false"
                   @close="$emit('close')">
            <el-table :data="tableData" v-loading="tableLoading">
                <el-table-column prop="name" label="菜单名称" show-overflow-tooltip></el-table-column>
                <el-table-column prop="desc" label="菜单描述" show-overflow-tooltip></el-table-column>
                <el-table-column label="操作" width="160px" v-if="has_permission('publish_app_menu_view')">
                    <template slot-scope="scope">
                        <el-button size="small" type="primary" @click="editOpen(scope.row)">编辑</el-button>
                    </template>
                </el-table-column>
            </el-table>
        </el-dialog>
        <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" :close-on-click-modal="false">
            <el-form :model="form" label-width="80px" label-position="left">
                <el-form-item label="命令内容">
                    <color-input v-model="form.command"></color-input>
                </el-form-item>
            </el-form>
            <div slot="footer">
                <el-button @click="dialogVisible = false">取消</el-button>
                <el-button v-if="has_permission('publish_app_menu_edit')" type="primary" @click="saveCommit" :loading="btnSaveLoading">保存</el-button>
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
        props: ['owner'],
        data() {
            return {
                tableLoading: false,
                visible: true,
                dialogVisible: false,
                dialogTitle: '',
                btnSaveLoading: false,
                tableData: [],
                form: {}
            }
        },
        methods: {
            fetch() {
                this.loading = true;
                this.$http.get(`/api/deploy/apps/${this.owner.id}/menus?type=built-in`).then(res => {
                    let tmp = [];
                    for (let item of res.result) {
                        if (item['name'] === '容器创建') {
                            tmp[0] = item
                        } else if (item['name'] === '应用发布') {
                            tmp[1] = item
                        } else if (item['name'] === '容器启动')
                            tmp[2] = item
                    }
                    this.tableData = tmp;
                }, res => this.$layer_message(res.result)).finally(() => this.loading = false)
            },
            editOpen(row) {
                this.form = this.$deepCopy(row);
                this.dialogTitle = '菜单编辑 - ' + row['name'];
                this.dialogVisible = true
            },
            saveCommit() {
                this.btnSaveLoading = true;
                this.$http.post(`/api/deploy/apps/${this.owner.id}/bind/menus`, this.form).then(() => {
                    this.dialogVisible = false;
                    this.fetch()
                }, res => this.$layer_message(res.result)).finally(() => this.btnSaveLoading = false)
            }
        },
        created() {
            this.fetch()
        }
    }
</script>