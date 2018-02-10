<template>
    <div>
        <el-row style="text-align: right; margin-bottom: 15px">
            <el-button @click="fetch">刷新</el-button>
            <el-button v-if="has_permission('publish_image_add')" type="info" @click="add">添加镜像</el-button>
            <el-button v-if="has_permission('publish_image_sync')" type="primary" @click="sync">同步</el-button>
        </el-row>
        <el-table :data="tableData" @expand-change="ev_expand" style="width: 100%" v-loading="tableLoading">
            <el-table-column type="expand">
                <template slot-scope="props" v-loading="true">
                    <el-form v-if="props.row.hasOwnProperty('tags') && props.row.tags.length > 0" label-position="left"
                             inline
                             class="demo-table-expand">
                        <el-form-item label="标签" style="width: 40%"></el-form-item>
                        <el-form-item label="创建日期" style="width: 40%"></el-form-item>
                        <el-form-item label="操作" style="width: 20%"></el-form-item>
                        <template v-for="tag in props.row.tags">
                            <el-form-item style="width: 40%">
                                <span>{{ tag.name }}</span>
                            </el-form-item>
                            <el-form-item style="width: 40%">
                                <span>{{ tag.created }}</span>
                            </el-form-item>
                            <el-form-item style="width: 20%" v-if="has_permission('publish_image_del')">
                                <el-button size="small" :plain="true" type="danger" @click="removeTag(props.row, tag)"
                                           :loading="btnDelTagLoading[tag.id]">删除
                                </el-button>
                            </el-form-item>
                        </template>
                    </el-form>
                    <el-row v-else-if="props.row.hasOwnProperty('tags')" style="text-align: center">
                        <span style="color: #99a9bf">没有标签，请点击更新同步标签</span>
                    </el-row>
                    <el-row v-else style="text-align: center">
                        <span style="color: #99a9bf">加载中...</span>
                    </el-row>
                </template>
            </el-table-column>
            <el-table-column prop="name" label="名称"></el-table-column>
            <el-table-column prop="desc" label="描述" show-overflow-tooltip></el-table-column>
            <el-table-column label="操作" width="180" v-if="has_permission('publish_image_sync|publish_image_edit|publish_image_del|publish_image_var_view')">
                <template slot-scope="scope">
                    <el-button v-if="has_permission('publish_image_sync')" size="small" type="primary" @click="updateTag(scope.row)" style="margin-right: 15px" :loading="btnUpdateLoading[scope.row.id]">
                        更新
                    </el-button>
                    <el-dropdown trigger="click" @command="do_action" v-if="has_permission('publish_image_edit|publish_image_del|publish_image_var_view')">
                        <el-button type="text">更多<i class="el-icon-caret-bottom el-icon--right"></i></el-button>
                        <el-dropdown-menu slot="dropdown">
                            <el-dropdown-item v-if="has_permission('publish_image_edit')" :command="`edit ${scope.$index}`">编辑</el-dropdown-item>
                            <el-dropdown-item v-if="has_permission('publish_image_del')" :command="`del ${scope.$index}`">删除</el-dropdown-item>
                            <el-dropdown-item v-if="has_permission('publish_image_var_view')" divided :command="`set ${scope.$index}`">设置</el-dropdown-item>
                        </el-dropdown-menu>
                    </el-dropdown>
                </template>
            </el-table-column>
        </el-table>
        <el-dialog title="镜像添加" :visible.sync="dialogMirrorVisible">
            <el-form>
                <el-form-item label="镜像名称">
                    <el-input v-model="form.name" placeholder="请输入镜像的名称" ></el-input>
                </el-form-item>
                <el-form-item label="镜像描述">
                    <el-input v-model="form.desc" type="textarea" placeholder="请输入镜像的描述信息"></el-input>
                </el-form-item>
                <el-form-item label="镜像tag">
                    <el-input v-model="form.tag" type="textarea" placeholder="请输入镜像的 tag"></el-input>
                </el-form-item>
            </el-form>
            <div slot="footer">
                <el-button @click="dialogMirrorVisible = false">取消</el-button>
                <el-button type="primary" @click="saveMirrorAdd" :loading="btnSaveLoading">保存</el-button>
            </div>
        </el-dialog>
        <el-dialog title="镜像编辑" :visible.sync="dialogVisible">
            <el-form>
                <el-form-item label="镜像名称">
                    <el-input v-model="form.name" placeholder="请输入镜像的名称" disabled></el-input>
                </el-form-item>
                <el-form-item label="镜像描述">
                    <el-input v-model="form.desc" type="textarea" placeholder="请输入镜像的描述信息"></el-input>
                </el-form-item>
            </el-form>
            <div slot="footer">
                <el-button @click="dialogVisible=false">取消</el-button>
                <el-button type="primary" @click="saveCommit" :loading="btnSaveLoading">保存</el-button>
            </div>
        </el-dialog>
        <el-dialog title="设置编辑" :visible.sync="dialogEditSetVisible">
            <el-form>
                <el-form-item label="名称" required>
                    <el-input v-model="set_form.name" placeholder="请输入名称"></el-input>
                </el-form-item>
                <el-form-item label="取值" required>
                    <el-input v-model="set_form.value" placeholder="请输入对应的值"></el-input>
                </el-form-item>
                <el-form-item label="描述" required>
                    <el-input type="textarea" autosize v-model="set_form.desc" placeholder="这里输入描述信息"></el-input>
                </el-form-item>
            </el-form>
            <div slot="footer">
                <el-button @click="dialogEditSetVisible = false">取消</el-button>
                <el-button type="primary" @click="saveSetCommit" :loading="btnSaveLoading">保存</el-button>
            </div>
        </el-dialog>
        <el-dialog title="镜像设置" :visible.sync="dialogSetVisible">
            <el-table :data="cfgTableData" v-loading="cfgTableLoading" style="width: 100%">
                <el-table-column prop="name" label="名称"></el-table-column>
                <el-table-column prop="value" label="取值"></el-table-column>
                <el-table-column label="操作" width="150px" v-if="has_permission('publish_image_var_edit|publish_image_var_del')">
                    <template slot-scope="scope">
                        <el-button v-if="has_permission('publish_image_var_edit')" size="small" @click="dialogEditSetVisible = true; set_form=$deepCopy(scope.row)">编辑</el-button>
                        <el-button v-if="has_permission('publish_image_var_del')" size="small" type="danger" @click="delSetCommit(scope.row)" :loading="btnDelLoading[scope.row.id]">删除</el-button>
                    </template>
                </el-table-column>
            </el-table>
            <div slot="footer">
                <el-button @click="dialogSetVisible = false">关闭</el-button>
                <el-button v-if="has_permission('publish_image_var_add')" type="primary" @click="dialogEditSetVisible = true; set_form={}">新建</el-button>
            </div>
        </el-dialog>
    </div>
</template>

<style>
    .demo-table-expand {
        font-size: 0;
    }

    .demo-table-expand label {
        color: #99a9bf;
    }

    .demo-table-expand .el-form-item {
        margin-right: 0;
        margin-bottom: 0;
    }
</style>

<script>
    export default {
        data () {
            return {
                tableLoading: false,
                btnSaveLoading: false,
                btnDelLoading: {},
                btnDelTagLoading: {},
                btnUpdateLoading: {},
                cfgTableLoading: false,
                dialogVisible: false,
                dialogSetVisible: false,
                dialogMirrorVisible: false,
                dialogEditSetVisible: false,
                tableData: [],
                cfgTableData: [],
                form: {},
                set_form: {}
            }
        },
        methods: {
            fetch () {
                this.tableLoading = true;
                this.$http.get('/api/deploy/images/').then(res => {
                    this.tableData = res.result
                }, res => this.$layer_message(res.result)).finally(() => this.tableLoading = false)
            },
            sync () {
                this.tableLoading = true;
                this.$http.post('/api/deploy/images/sync').then(() => {
                    this.fetch()
                }, res => this.$layer_message(res.result)).finally(() => this.tableLoading = false)
            },
            add () {
                this.dialogMirrorVisible = true;
            },
            fetchCfg () {
                this.cfgTableLoading = true;
                this.$http.get(`/api/deploy/configs/image/${this.form.id}`)
                    .then(res => this.cfgTableData = res.result, res => this.$layer_message(res.result))
                    .finally(() => this.cfgTableLoading = false)
            },
            updateTag (row) {
                this.btnUpdateLoading = {[row.id]: true};
                this.$http.post(`/api/deploy/images/sync/${row.id}`).then(() => {
                    this.fetch()
                }, res => this.$layer_message(res.result)).finally(() => this.btnUpdateLoading = {})
            },
            ev_expand (row, expanded) {
                if (expanded && row.tags === undefined) {
                    this.$http.get(`/api/deploy/images/${row.id}/tags/`).then(res => {
                        this.$set(row, 'tags', res.result)
                    }, res => this.$layer_message(res.result))
                }
            },
            do_action (command) {
                let [action, index] = command.split(' ');
                this.form = this.$deepCopy(this.tableData[index]);
                if (action === 'edit') {
                    this.dialogVisible = true
                } else if (action === 'del') {
                    this.$confirm(`此操作将永久删除 ${this.form.name}，是否继续？`, '删除确认', {type: 'warning'}).then(() => {
                        this.$http.delete(`/api/deploy/images/${this.form.id}`).then(() => {
                            this.fetch()
                        }, res => this.$layer_message(res.result))
                    })
                } else if (action === 'set') {
                    this.fetchCfg();
                    this.dialogSetVisible = true
                }
            },
            removeTag (row, tag) {
                this.$confirm(`此处仅删除元数据，请手动执行垃圾回收（docker exec CONTAINER registry garbage-collect /etc/docker/registry/config.yml），推荐添加至任务计划，确定要删除标签 ${tag.name} ? `, '确认', {
                    type: 'warning'
                }).then(() => {
                    this.btnDelTagLoading = {[tag.id]: true};
                    this.$http.delete(`/api/deploy/images/${tag.image_id}/tags/${tag.id}`)
                        .then(() => row.tags = row.tags.filter(x => x.id !== tag.id), res => this.$layer_message(res.result))
                        .finally(() => this.btnDelTagLoading = {})
                }).catch(() => {
                })
            },
            saveCommit () {
                this.btnSaveLoading = true;
                this.$http.put(`/api/deploy/images/${this.form.id}`, this.form).then(() => {
                    this.dialogVisible = false;
                    this.fetch()
                }, res => this.$layer_message(res.result))
                    .finally(() => this.btnSaveLoading = false)
            },
            saveMirrorAdd () {
                this.btnSaveLoading = true;
                this.$http.post(`/api/deploy/images/add`, this.form).then(() => {
                    this.dialogMirrorVisible = false;
                    this.form = {};
                    this.fetch()
                }, res => this.$layer_message(res.result))
                    .finally(() => this.btnSaveLoading = false)
            },
            saveSetCommit () {
                this.btnSaveLoading = true;
                let request;
                if (this.set_form.id) {
                    request = this.$http.put(`/api/deploy/configs/image/${this.form.id}`, this.set_form)
                } else {
                    request = this.$http.post(`/api/deploy/configs/image/${this.form.id}`, this.set_form)
                }
                request.then(() => {
                    this.dialogEditSetVisible = false;
                    this.fetchCfg()
                }, res => this.$layer_message(res.result)).finally(() => this.btnSaveLoading = false)
            },
            delSetCommit (row) {
                this.btnDelLoading = {[row.id]: true};
                this.$http.delete(`/api/deploy/configs/image/${row.id}`)
                    .then(() => this.fetchCfg(), res => this.$layer_message(res.result))
                    .finally(() => this.btnDelLoading = {})
            }
        },
        created () {
            this.fetch()
        }
    }
</script>
