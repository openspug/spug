<template>
    <div>
        <el-select v-model="app_id" @change="fetchEnabledHosts">
            <el-option v-for="item in apps" :key="item.id" :value="item.id" :label="item.name"></el-option>
        </el-select>
        <el-select v-model="env_id" @change="fetchEnabledHosts" style="margin-left: 15px">
            <el-option v-for="item in environments" :key="item.id" :value="item.id" :label="item.name"></el-option>
        </el-select>
        <el-button v-if="has_permission('publish_app_publish_deploy') && (TopDeployMenus.length === 0 || hideDeployBtn)"
                   @click="dialogPreDeployVisible = true"
                   type="primary" style="float: right; margin-left: 15px"
                   :disabled="hideDeployBtn">发布
        </el-button>
        <el-dropdown v-else-if="has_permission('publish_app_publish_deploy')" split-button type="primary"
                     @click="dialogPreDeployVisible = true"
                     :disabled="hideDeployBtn"
                     @command="do_action"
                     style="float: right; margin-left: 15px; ">发布
            <el-dropdown-menu slot="dropdown" v-if="has_permission('publish_app_publish_menu_exec')">
                <el-dropdown-item v-for="item in TopDeployMenus" :key="item.id" :command="`${item.id}`"
                                  style="color: #475669"
                                  :disabled="hideDeployBtn">{{item.name}}
                </el-dropdown-item>
            </el-dropdown-menu>
        </el-dropdown>

        <el-button v-if="has_permission('publish_app_publish_host_select')" style="float: right; margin-left: 15px"
                   @click="fetchAllHosts">选择主机
        </el-button>
        <el-button style="float: right" @click="fetchEnabledHosts">刷新</el-button>
        <div v-loading="tableLoading || fields === undefined">
            <el-table v-if="fields !== undefined"
                      ref="multipleTable"
                      :data="tableData"
                      @selection-change="handleSelectHost"
                      @row-click="handleClickRow"
                      style="width: 100%; margin-top: 20px">
                <el-table-column type="selection" width="50"></el-table-column>
                <el-table-column prop="name" label="主机" show-overflow-tooltip></el-table-column>
                <el-table-column label="镜像版本" show-overflow-tooltip>
                    <template slot-scope="scope">
                        <span v-if="scope.row.image">{{ scope.row.image }}</span>
                        <i v-else class="el-icon-loading"></i>
                    </template>
                </el-table-column>
                <el-table-column v-for="field in fields" :key="field.id" :label="field.name" show-overflow-tooltip>
                    <template slot-scope="scope">
                        <span v-if="field.output[scope.row.id]">{{ field.output[scope.row.id] }}</span>
                        <i v-else class="el-icon-loading"></i>
                    </template>
                </el-table-column>
                <el-table-column label="状态" ref="table_status">
                    <template slot-scope="scope">
                        <el-tooltip :content="scope.row.status" placement="top" :enterable="false">
                            <el-tag v-if="scope.row.status === 'v_start exit'" type="warning">运行中</el-tag>
                            <el-tag v-else-if="scope.row.running" type="success">运行中</el-tag>
                            <el-tag v-else-if="scope.row.status === 'N/A'" type="info">未发布</el-tag>
                            <el-tag v-else-if="scope.row.status === 'ERROR'" type="danger">异常</el-tag>
                            <el-tag v-else-if="scope.row.running === false" type="danger">已停止</el-tag>
                            <i v-else class="el-icon-loading"></i>
                        </el-tooltip>
                    </template>
                </el-table-column>
                <el-table-column label="操作" width="170px"
                                 v-if="has_permission('publish_app_publish_ctr_control|publish_app_publish_ctr_del') || (RowDeployMenus.length && has_permission('publish_app_publish_menu_exec'))">
                    <template slot-scope="scope">
                        <el-button v-if="has_permission('publish_app_publish_ctr_control') && scope.row.running"
                                   type="danger"
                                   :disabled="scope.row.status === 'N/A'" @click="doAction(scope.row, 'v_stop')"
                                   size="small"
                                   style="margin-right: 15px"
                                   :loading="btnCtrLoading[scope.row.id]">停止
                        </el-button>
                        <el-button v-else-if="has_permission('publish_app_publish_ctr_control')" size="small"
                                   type="success"
                                   :disabled="scope.row.status === 'N/A'"
                                   @click="doAction(scope.row, 'v_start')"
                                   style="margin-right: 15px"
                                   :loading="btnCtrLoading[scope.row.id]">启动
                        </el-button>
                        <el-dropdown @command="do_action"
                                     v-if="has_permission('publish_app_publish_ctr_del') || (RowDeployMenus.length && has_permission('publish_app_publish_menu_exec'))">
                            <el-button type="text">更多<i class="el-icon-caret-bottom el-icon--right"></i></el-button>
                            <el-dropdown-menu slot="dropdown">
                                <el-dropdown-item v-for="item in RowDeployMenus"
                                                  v-if="has_permission('publish_app_publish_menu_exec')" :key="item.id"
                                                  :command="`${item.id} ${scope.row.id}`"
                                                  style="color: #20A0FF">{{item.name}}
                                </el-dropdown-item>
                                <el-dropdown-item :disabled="scope.row.status === 'N/A'"
                                                  :command="`console_log ${scope.row.id}`">日志
                                </el-dropdown-item>
                                <el-dropdown-item v-if="has_permission('publish_app_publish_ctr_del')"
                                                  :disabled="scope.row.status === 'N/A'" divided
                                                  :command="`del ${scope.row.id}`">删除
                                </el-dropdown-item>
                            </el-dropdown-menu>
                        </el-dropdown>
                    </template>
                </el-table-column>
            </el-table>
        </div>
        <el-dialog title="选择启用的主机" :visible.sync="dialogSelectVisible" :close-on-click-modal="false">
            <el-tree :data="treeData" ref="tree" nodeKey="id" showCheckbox></el-tree>
            <div slot="footer">
                <el-button @click="dialogSelectVisible = false">取 消</el-button>
                <el-button type="primary" @click="saveHost" :loading="dialogLoading">确 定</el-button>
            </div>
        </el-dialog>
        <el-dialog title="应用发布" :visible.sync="dialogDeployVisible" @close="fetchHostStatus(true)"
                   :close-on-click-modal="false">
            <el-collapse :value="showItem" accordion>
                <el-collapse-item v-for="item in updateHosts" :key="item.id" :name="item.id">
                    <template slot="title">
                        <el-tag :type="item.type" style="margin-right: 15px">{{item.name}}</el-tag>
                        {{item.latest}}
                    </template>
                    <pre v-for="line in item.detail">{{line}}</pre>
                </el-collapse-item>
            </el-collapse>
        </el-dialog>
        <el-dialog title="发布提示" :visible.sync="dialogPreDeployVisible" :close-on-click-modal="false">
            <el-form label-width="80px">
                <el-form-item v-if="!SysDeployMenus['_init'].id" label="初始化">
                    <color-input v-model="SysDeployMenus['_init'].command"></color-input>
                </el-form-item>
                <el-form-item v-if="!SysDeployMenus['_update'].id" label="发布执行">
                    <color-input v-model="SysDeployMenus['_update'].command"></color-input>
                </el-form-item>
                <el-form-item v-if="!SysDeployMenus['_start'].id" label="启动执行">
                    <color-input v-model="SysDeployMenus['_start'].command"></color-input>
                </el-form-item>
                <el-form-item label="输入消息">
                    <el-autocomplete popper-class="my-autocomplete" v-model="deploy_message"
                                     :fetch-suggestions="querySearch"
                                     valueKey="deploy_message"
                                     style="width: 280px"
                                     custom-item="my-item-zh" placeholder="此内容会作为位置参数传递给更新命令"></el-autocomplete>
                </el-form-item>
                <el-form-item label="重启容器">
                    <el-switch v-model="deploy_restart"></el-switch>
                </el-form-item>
            </el-form>
            <div slot="footer">
                <el-button @click="dialogPreDeployVisible = false">取 消</el-button>
                <el-button type="primary" @click="handleDeploy" :loading="dialogLoading">确 定</el-button>
            </div>
        </el-dialog>
        <el-dialog title="控制台日志" :visible.sync="console_logs.show" :close-on-click-modal="false">
            <pre>{{console_logs.detail}}</pre>
        </el-dialog>
        <menu-exec v-if="dialogMsgVisible" :menu="menus[execForm['menu_id']]" :data="execForm"
                   @close="dialogMsgVisible = false"></menu-exec>
    </div>
</template>

<style>
    pre {
        display: block;
        padding: 5px 9px;
        margin: 0 0 10px;
        font-size: 13px;
        line-height: 1.42857143;
        color: #333;
        word-break: break-all;
        word-wrap: break-word;
        background-color: #f5f5f5;
        border: 1px solid #ccc;
        border-radius: 4px;
        white-space: pre-line;
    }

    .el-collapse-item__header {
        overflow: hidden;
    }

    .my-autocomplete li {
        line-height: normal;
        padding: 7px;
    }

    .my-autocomplete li .name {
        text-overflow: ellipsis;
        overflow: hidden;
    }

    .my-autocomplete li .date {
        font-size: 12px;
        color: #b4b4b4;
    }

    .my-autocomplete li .highlighted .date {
        color: #ddd;
    }
</style>

<script>
    import ColorInput from './ColorInput.vue'
    import MenuExec from './MenuExec.vue'
    import Vue from 'vue'

    Vue.component('my-item-zh', {
        functional: true,
        render: function (h, ctx) {
            let item = ctx.props.item;
            return h('li', ctx.data, [
                h('div', {attrs: {'class': 'name'}}, [item.deploy_message]),
                h('span', {attrs: {'class': 'date'}}, [item.created])
            ]);
        },
        props: {
            item: {type: Object, required: true}
        }
    });

    export default {
        components: {
            MenuExec,
            'color-input': ColorInput,
            'menu-exec': MenuExec
        },
        data() {
            return {
                apps: [],
                env_id: '',
                environments: [],
                btnCtrLoading: {},
                dialogSelectVisible: false,
                dialogDeployVisible: false,
                dialogPreDeployVisible: false,
                dialogMsgVisible: false,
                dialogLoading: false,
                tableLoading: false,
                deploy_message: '',
                deploy_restart: false,
                deploy_histories: undefined,
                app_id: Number(this.$route.params['app_id']),
                tableData: [],
                treeData: [],
                updateHosts: [],
                fields: undefined,
                menus: {},
                execForm: {},
                TopDeployMenus: [],
                RowDeployMenus: [],
                SysDeployMenus: {'_init': {}, '_update': {}, '_start': {}},
                console_logs: {}
            }
        },
        computed: {
            hideDeployBtn() {
                return this.updateHosts.length === 0
            },
            showItem() {
                return (this.updateHosts.length === 1) ? this.updateHosts[0].id : ''
            },
            deployForm() {
                return {
                    app_id: this.app_id,
                    env_id: this.env_id,
                    deploy_message: this.deploy_message,
                    deploy_restart: this.deploy_restart,
                    host_ids: this.updateHosts.map(x => x.id)
                }
            }
        },
        methods: {
            // 选择发布主机页面 保存操作处理
            saveHost() {
                this.dialogLoading = true;
                let host_ids = this.$refs['tree'].getCheckedKeys();
                this.$http.post(`/api/deploy/apps/${this.app_id}/bind/hosts`, {
                    ids: host_ids.filter(x => x),
                    env_id: this.env_id
                }).then(() => {
                    this.fetchEnabledHosts();
                    this.dialogSelectVisible = false
                }, res => {
                    this.$layer_message(res.result);
                    this.updateSelectedHosts()
                }).finally(() => this.dialogLoading = false)
            },
            // 更新选择发布主机弹出页面的勾选状态
            updateSelectedHosts() {
                if (this.treeData.length) {
                    this.$refs['tree'].setCheckedKeys(this.tableData.map(x => x.id))
                }
            },
            // 获取自定义菜单
            fetchDeployMenus() {
                this.$http.get(`/api/deploy/apps/${this.app_id}/menus?type=all`).then(res => {
                    for (let item of res.result) {
                        this.menus[item.id] = item;
                        if (item.position === 1) {
                            this.TopDeployMenus.push(item)
                        } else if (item.position === 2) {
                            this.RowDeployMenus.push(item)
                        } else if (item.name === '容器创建') {
                            this.SysDeployMenus['_init'] = item
                        } else if (item.name === '应用发布') {
                            this.SysDeployMenus['_update'] = item
                        } else if (item.name === '容器启动') {
                            this.SysDeployMenus['_start'] = item
                        }
                    }
                }, res => this.$layer_message(res.result))
            },
            // 更新自定义字段
            updateDeployFields() {
                this.fields = this.fields.map(x => {
                    x['output'] = [];
                    return x
                });
                for (let item of this.fields) {
                    for (let host of this.tableData) {
                        let form = {host_id: host.id, env_id: this.env_id, app_id: this.app_id};
                        this.$http.post(`/api/deploy/fields/${item.id}/exec`, form).then(res => {
                            this.$set(item['output'], host.id, res.result)
                        }, res => {
                            this.$set(item['output'], host.id, 'N/A');
                            this.$layer_message(res.result)
                        })
                    }
                }
            },
            // 获取自定义字段
            fetchDeployFields() {
                if (this.fields === undefined) {
                    this.$http.get(`/api/deploy/apps/${this.app_id}/fields`).then(res => {
                        this.fields = res.result.map(x => {
                            x['output'] = '';
                            return x
                        });
                        this.updateDeployFields()
                    }, res => this.$layer_message(res.result))
                } else {
                    this.updateDeployFields()
                }
            },
            // 处理发布弹出页中输入信息的可选项，可选项为发布的历史记录
            querySearch(query, cb) {
                if (this.deploy_histories === undefined) {
                    this.$http.get(`/api/deploy/publish/history/${this.app_id}`).then(res => {
                        this.deploy_histories = res.result;
                        cb(this.filter_history(query))
                    })
                } else {
                    cb(this.filter_history(query))
                }
            },
            // 配合querySearch方法，过滤用户输入的匹配项
            filter_history(query) {
                return query ? this.deploy_histories.filter(item => {
                    return item['deploy_message'].indexOf(query) === 0
                }) : this.deploy_histories
            },
            // 选择发布主机
            fetchAllHosts() {
                this.dialogSelectVisible = true;
                if (this.treeData.length) return;
                this.$http.get('/api/assets/hosts/?page=-1').then(res => {
                    let rst = {};
                    for (let host of res.result.data) {
                        if (rst.hasOwnProperty(host.zone)) {
                            rst[host.zone].push({label: `${host.name} （${host.desc}）`, id: host.id})
                        } else {
                            rst[host.zone] = [{label: `${host.name} （${host.desc}）`, id: host.id}]
                        }
                    }
                    let tmp = [];
                    for (let k in rst) {
                        tmp.push({label: k, children: rst[k]})
                    }
                    this.treeData = tmp;
                    this.updateSelectedHosts()
                }, res => this.$layer_message(res.result))
            },
            fetchEnabledHosts() {
                if (!this.env_id) return;
                this.tableLoading = true;
                this.$http.get(`/api/deploy/hosts/${this.app_id}/${this.env_id}`).then(res => {
                    this.tableData = res.result;
                    this.fetchHostStatus();
                    this.updateSelectedHosts()
                }, res => this.$layer_message(res.result)).finally(() => this.tableLoading = false)
            },
            fetchHostStatus(alone) {
                if (alone) this.tableLoading = true;
                // 应用发布后设置history为undefined，以让下次点击发布时更新输入信息的历史记录
                this.deploy_histories = undefined;
                // 应用发布后更新自定义字段的值
                this.fetchDeployFields();
                // 更新容器状态
                for (let item of this.tableData) {
                    // 先设置字段值为空，使页面出现loading
                    this.$set(item, 'running', '');
                    this.$set(item, 'status', '');
                    this.$set(item, 'image', '');
                    this.$http.post('/api/deploy/hosts/state', {
                        app_id: this.app_id,
                        env_id: this.env_id,
                        cli_id: item.id
                    }).then(res => {
                        this.$set(item, 'running', res.result['running']);
                        this.$set(item, 'status', res.result['status']);
                        if (res.result['image'] !== 'N/A') {
                            res.result['image'] = res.result['image'].split('/')[1]
                        }
                        this.$set(item, 'image', res.result['image'])
                    }, res => {
                        this.$set(item, 'running', false);
                        this.$set(item, 'status', 'ERROR');
                        this.$set(item, 'image', 'N/A');
                        this.$layer_message(res.result)
                    }).finally(() => this.tableLoading = false)
                }
            },
            handleSelectHost(val) {
                let local_val = this.$deepCopy(val);
                for (let item of local_val) {
                    item.type = 'info';
                    item.latest = '等待调度 . . . '
                }
                this.updateHosts = local_val
            },
            _handleDeploy() {
                this.$http.post('/api/deploy/publish/update', this.deployForm).then(res => {
                    this.dialogPreDeployVisible = false;
                    this.dialogDeployVisible = true;
                    // 初始化状态
                    for (let [index, item] of this.updateHosts.entries()) {
                        item.type = 'info';
                        delete item.detail;
                        delete item.latest;
                        this.$set(this.updateHosts, index, item)
                    }
                    this.fetchDeployResult(res.result);
                }, res => this.$layer_message(res.result)).finally(() => this.dialogLoading = false)
            },
            handleDeploy() {
                this.dialogLoading = true;
                if (!this.SysDeployMenus['_update'].id) {
                    this.$http.post(`/api/deploy/apps/${this.app_id}/bind/menus`, [
                        {'name': '容器创建', 'command': this.SysDeployMenus['_init'].command},
                        {'name': '应用发布', 'command': this.SysDeployMenus['_update'].command},
                        {'name': '容器启动', 'command': this.SysDeployMenus['_start'].command}
                    ]).then(() => {
                        this._handleDeploy();
                        this.fetchDeployMenus()
                    }, res => {
                        this.$layer_message(res.result);
                        this.dialogLoading = false
                    })
                } else {
                    this._handleDeploy()
                }
            },
            fetchDeployResult(token) {
                this.$http.get(`/api/common/queue/state/${token}`).then(res => {
                    if (res.result['complete'] === true) return;
                    this.fetchDeployResult(token);
                    for (let [index, item] of Object.entries(this.updateHosts)) {
                        if (item.hasOwnProperty('detail') === false) item.detail = [];
                        if (item.id === res.result.hid) {
                            if (res.result.update === true) item.detail.pop();
                            item.detail.push(res.result.msg);
                            if (res.result.level !== 'console') item.latest = res.result.msg;
                            if (res.result.level === 'error') item.type = 'danger';
                            if (res.result.level === 'success') item.type = 'success';
                            this.$set(this.updateHosts, index, item);
                            break
                        }
                    }
                }, res => this.$layer_message(res.result))
            },
            doAction(row, action) {
                this.btnCtrLoading = {[row.id]: true};
                this.$http.post(`/api/deploy/hosts/`, {
                    app_id: this.app_id,
                    env_id: this.env_id,
                    cli_id: row.id,
                    action: action
                }).then(() => {
                    this.fetchHostStatus(true)
                }, res => this.$layer_message(res.result)).finally(() => {
                    this.btnCtrLoading = {}
                })
            },
            do_action(command) {
                let [action, cli_id] = command.split(' ');
                let form = {app_id: this.app_id, env_id: this.env_id, cli_id: cli_id};
                if (action === 'del') {
                    form['action'] = 'v_remove';
                    this.$confirm('此操作将删除该容器，是否继续？', '提示', {type: 'warning'}).then(() => {
                        this.tableLoading = true;
                        this.$http.post(`/api/deploy/hosts/`, form)
                            .then(() => this.fetchHostStatus(true), res => {
                                this.tableLoading = false;
                                this.$layer_message(res.result)
                            })
                    }).catch(() => {
                    })
                } else if (action === 'console_log') {
                    this.$http.post(`/api/deploy/hosts/logs`, form).then(res => {
                        this.console_logs = {show: true, detail: res.result}
                    }, res => this.$layer_message(res.result))
                } else {
                    this.execForm = {app_id: this.app_id, env_id: this.env_id, menu_id: action};
                    if (cli_id) {
                        this.execForm['host_ids'] = [cli_id];
                    } else {
                        this.execForm['host_ids'] = this.updateHosts.map(x => x.id)
                    }
                    this.dialogMsgVisible = true;
                }
            },
            handleClickRow(row) {
                this.$refs.multipleTable.toggleRowSelection(row)
            }
        },
        mounted() {
            this.fetchDeployMenus();
            this.$http.get('/api/configuration/environments/with_publish_permission').then(res => {
                this.environments = res.result;
                if (this.environments.length) {
                    this.env_id = this.environments[0].id;
                    this.fetchEnabledHosts()
                } else {
                    this.fields = [];
                    this.$layer_message('请在配置管理的环境管理中先创建发布环境')
                }
            }, res => this.$layer_message(res.result));
            this.$http.get('/api/deploy/apps/').then(res => {
                this.apps = res.result;
            }, res => this.$layer_message(res.result))
            // select 组件在初始化时会自动调用，固这里不需要在调用 fetchEnabledHosts()
            // this.fetchEnabledHosts()
        }
    }
</script>
