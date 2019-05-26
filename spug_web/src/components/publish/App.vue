<template>
    <div>
        <el-row>
            <el-col :span="8">
                <el-select v-model="group" @change="fetch()" placeholder="请选择分组">
                    <el-option v-for="item in groups" :key="item" :value="item"></el-option>
                </el-select>
            </el-col>
            <el-col :span="8" :offset="8" style="text-align: right">
                <el-button @click="fetch(true)">刷新</el-button>
                <el-button v-if="has_permission('publish_app_add')" type="primary" @click="addOpen">添加应用</el-button>
            </el-col>
        </el-row>
        <el-table :data="tableData" v-loading="tableLoading" style="width: 100%; margin-top: 20px">
            <el-table-column prop="group" label="分组" min-width="100"></el-table-column>
            <el-table-column prop="name" label="名称" min-width="100"></el-table-column>
            <el-table-column prop="notify_way_name" label="通知名称"></el-table-column>
            <el-table-column prop="desc" label="描述" show-overflow-tooltip></el-table-column>
            <el-table-column label="操作" width="150">
                <template slot-scope="scope">
                    <el-button size="small" type="primary" @click="go_deploy(scope.row)" style="margin-right: 15px">管理
                    </el-button>
                    <el-dropdown trigger="click" @command="do_action"
                                 v-if="has_permission('publish_app_edit|publish_app_del|publish_app_ctr_view|publish_app_var_view|publish_app_menu_view')">
                        <el-button type="text">更多<i class="el-icon-caret-bottom el-icon--right"></i></el-button>
                        <el-dropdown-menu slot="dropdown">
                            <el-dropdown-item v-if="has_permission('publish_app_edit')"
                                              :command="`edit ${scope.$index}`">编辑
                            </el-dropdown-item>
                            <el-dropdown-item v-if="has_permission('publish_app_del')" :command="`del ${scope.$index}`">
                                删除
                            </el-dropdown-item>
                            <el-dropdown-item v-if="has_permission('publish_app_ctr_view')" divided
                                              :command="`set ${scope.$index}`">容器设置
                            </el-dropdown-item>
                            <el-dropdown-item v-if="has_permission('publish_app_var_view')"
                                              :command="`env ${scope.$index}`">应用设置
                            </el-dropdown-item>
                            <el-dropdown-item v-if="has_permission('publish_app_menu_view')"
                                              :command="`menu ${scope.$index}`">菜单管理
                            </el-dropdown-item>
                        </el-dropdown-menu>
                    </el-dropdown>
                </template>
            </el-table-column>
        </el-table>
        <el-dialog title="添加应用" :visible.sync="dialogAddVisible" :close-on-click-modal="false">
            <el-form :model="form" label-width="80px">
                <el-form-item label="应用分组" required>
                    <el-select v-model="form.group" placeholder="选择应用分组">
                        <el-option v-for="g in groups" :value="g" :key="g"></el-option>
                    </el-select>
                    <el-button style="margin-left: 15px" type="text" @click="addGroup">添加分组</el-button>
                </el-form-item>
                <el-form-item label="应用名称" required>
                    <el-input v-model="form.name" placeholder="请输入应用名称"></el-input>
                </el-form-item>
                <el-form-item label="通知名称" required>
                    <el-select v-model="form.notify_way_id" placeholder="选择通知名称">
                        <el-option v-for="n in notifyWays" :value="n.id" :label="n.name"
                                   :key="n.id"></el-option>
                    </el-select>
                </el-form-item>

                <el-form-item label="应用描述" required>
                    <el-input type="textarea" autosize v-model="form.desc" placeholder="请输入应用描述"></el-input>
                </el-form-item>
                <el-form-item label="应用标识" required>
                    <el-input v-model="form.identify" placeholder="请输入应用唯一标识"></el-input>
                </el-form-item>
                <el-form-item label="应用镜像" required>
                    <el-select v-model="form.image_id" placeholder="选择镜像">
                        <el-option v-for="image in images" :value="image.id" :label="image.name"
                                   :key="image.id"></el-option>
                    </el-select>
                    <el-button style="margin-left: 15px" type="text" @click="toPublishImage">添加镜像</el-button>
                </el-form-item>
            </el-form>
            <div slot="footer">
                <el-button @click="dialogAddVisible=false">取消</el-button>
                <el-button type="primary" @click="saveCommit" :loading="btnSaveLoading">保存</el-button>
            </div>
        </el-dialog>
        <app-setting v-if="dialogSetVisible" :owner="form" :environments="environments"
                     @close="dialogSetVisible = false"></app-setting>
        <app-config v-if="dialogEnvVisible" :owner="form" :environments="environments"
                    @close="dialogEnvVisible = false"></app-config>
        <app-menu v-if="dialogMenuVisible" :owner="form" @close="dialogMenuVisible = false"></app-menu>
    </div>
</template>


<script>
    import AppSetting from './AppSetting.vue'
    import AppConfig from './AppConfig.vue'
    import AppMenu from './AppMenu.vue'

    export default {
        components: {
            'app-setting': AppSetting,
            'app-config': AppConfig,
            'app-menu': AppMenu
        },
        data() {
            return {
                group: null,
                dialogAddVisible: false,
                dialogSetVisible: false,
                dialogEnvVisible: false,
                dialogMenuVisible: false,
                tableLoading: true,
                btnSaveLoading: false,
                form: this.init_form(),
                environments: undefined,
                tableData: [],
                images: [],
                notifyWays: [],
                groups: [],
            }
        },
        methods: {
            init_form() {
                return {
                    identify: '',
                    name: '',
                    desc: '',
                    group: '',
                    notify_way_id: '',
                    image_id: ''
                }
            },
            go_deploy(row) {
                this.$router.push({name: 'publish_deploy', params: {app_id: row.id}})
            },
            fetch(force) {
                this.tableLoading = true;
                let api_uri = '/api/deploy/apps/';
                if (this.group) api_uri += '?group=' + this.group;
                this.$http.get(api_uri).then(res => {
                    this.tableData = res.result
                }, res => this.$layer_message(res.result)).finally(() => this.tableLoading = false);
                if (force) this.$http.get('/api/deploy/apps/groups/').then(res => {
                    this.groups = res.result
                }, res => this.$layer_message(res.result))
            },
            fetchEnvironments() {
                if (this.environments === undefined) {
                    this.$http.get('/api/configuration/environments/').then(res => {
                        this.environments = res.result
                    }, res => this.$layer_message(res.result))
                }
            },
            fetchImages() {
                this.$http.get('/api/deploy/images/').then(res => this.images = res.result, res => this.$layer_message(res.result))
            },
            fetchNotifyWay() {
                this.$http.get('/api/system/notify/', {params: {page: -1}}).then(res=>{
                   this.notifyWays = res.result.data;
                }, res => this.$layer_message(res.result))
            },
            do_action(command) {
                let [action, index] = command.split(' ');
                this.form = this.$deepCopy(this.tableData[index]);
                if (action === 'edit') {
                    if (this.images.length === 0) this.fetchImages();
                    this.dialogAddVisible = true;
                    this.fetchNotifyWay();
                } else if (action === 'del') {
                    this.$confirm(`此操作将永久删除 ${this.form.name}，是否继续？`, '删除确认', {type: 'warning'}).then(() => {
                        this.$http.delete(`/api/deploy/apps/${this.form.id}`).then(() => {
                            this.fetch()
                        }, res => this.$layer_message(res.result))
                    }).catch(() => {
                    })
                } else if (action === 'set') {
                    this.fetchEnvironments();
                    this.dialogSetVisible = true
                } else if (action === 'env') {
                    this.fetchEnvironments();
                    this.dialogEnvVisible = true
                } else if (action === 'menu') {
                    this.dialogMenuVisible = true
                }
            },
            saveCommit() {
                this.btnSaveLoading = true;
                let request;
                if (this.form.id) {
                    request = this.$http.put('/api/deploy/apps/' + this.form.id, this.form)
                } else {
                    request = this.$http.post('/api/deploy/apps/', this.form)
                }
                request.then(() => {
                    this.dialogAddVisible = false;
                    this.fetch(true)
                }, res => this.$layer_message(res.result)).finally(() => this.btnSaveLoading = false)
            },
            addOpen() {
                // this.$router.push({name: 'app_add'})
                this.form = this.init_form();
                this.dialogAddVisible = true;
                this.fetchNotifyWay();
                if (this.images.length === 0) this.fetchImages()
            },
            addGroup() {
                this.$prompt('请输入新分组名称', '提示', {
                    inputPattern: /.+/,
                    inputErrorMessage: '请输入分组名称！'
                }).then(({value}) => {
                    this.form.group = value
                }).catch(() => {
                })
            },
            toPublishImage() {
                this.$router.push({name: 'publish_image'});
                this.$emit('routerChange')
            }
        },
        created() {
            this.fetch(true)
        }
    }
</script>
