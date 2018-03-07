<template>
    <div>
        <el-row>
            <el-col :span="8">
                <el-select v-model="job_group" @change="group_Search()" clearable placeholder="任务分组">
                    <el-option v-for="item in groups" :key="item" :value="item"></el-option>
                </el-select>
            </el-col>
            <el-col :span="8" :offset="8" style="text-align: right">
                <el-button @click="refresh()">刷新</el-button>
                <el-button v-if="has_permission('job_task_add')" type="primary" @click="addOpen">添加任务</el-button>
            </el-col>
        </el-row>
        <el-row>
            <el-table :data="tableData.data" v-loading="tableLoading"
                      :default-sort = "{prop: 'next_run_time'}"
                       style="width: 100%; margin-top: 20px">
                <el-table-column prop="group" label="分组" sortable></el-table-column>
                <el-table-column prop="name" label="名称" show-overflow-tooltip></el-table-column>
                <el-table-column prop="desc" label="描述" show-overflow-tooltip></el-table-column>
                <el-table-column prop="command" label="任务命令" show-overflow-tooltip></el-table-column>
                <el-table-column label="等待" width="120" sortable>
                    <template slot-scope="scope">
                        <el-tag :type="handleTagType(scope.row.next_run_time)">{{scope.row.next_run_time}}</el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="操作" width="170">
                    <template slot-scope="scope">
                        <el-button v-if="scope.row.enabled" type="danger" :loading="btnSwitchLoading[scope.row.id]"
                                   size="small"
                                   style="margin-right: 15px" @click="do_switch(scope.row)">禁用
                        </el-button>
                        <el-button v-else size="small" type="success" :loading="btnSwitchLoading[scope.row.id]"
                                   style="margin-right: 15px"
                                   @click="do_switch(scope.row)">启用
                        </el-button>
                        <el-dropdown trigger="click" @command="do_action">
                            <el-button type="text">更多<i class="el-icon-caret-bottom el-icon--right"></i></el-button>
                            <el-dropdown-menu slot="dropdown">
                                <el-dropdown-item v-if="has_permission('job_task_edit')" :command="`edit ${scope.$index}`">编辑</el-dropdown-item>
                                <el-dropdown-item v-if="has_permission('job_task_del')" :command="`del ${scope.$index}`">删除</el-dropdown-item>
                                <el-dropdown-item :command="`log ${scope.$index}`">历史</el-dropdown-item>
                                <el-dropdown-item v-if="has_permission('job_task_edit')" divided :command="`set ${scope.$index}`">设置触发器</el-dropdown-item>
                            </el-dropdown-menu>
                        </el-dropdown>
                    </template>
                </el-table-column>
            </el-table>

            <!--分页-->
            <div class="pagination-bar" v-if="tableData.total > 10">
                <el-pagination
                         @current-change="handleCurrentChange"
                        :current-page="currentPage"  layout="total, prev, pager, next"
                        :total="tableData.total">
                </el-pagination>
            </div>

        </el-row>
        <el-dialog title="任务编辑" :visible.sync="dialogAddVisible" :close-on-click-modal="false">
            <el-form label-width="80px">
                <el-form-item label="任务分组" required>
                    <el-select v-model="form.group" placeholder="选择任务分组">
                        <el-option v-for="g in groups" :value="g" :key="g"></el-option>
                    </el-select>
                    <el-button style="margin-left: 15px" type="text" @click="addGroup">添加任务分组</el-button>
                </el-form-item>
                <el-form-item label="任务名称" required>
                    <el-input v-model="form.name" placeholder="请输入任务名称"></el-input>
                </el-form-item>
                <el-form-item label="任务描述" required>
                    <el-input type="textarea" v-model="form.desc" placeholder="请输入任务描述"></el-input>
                </el-form-item>
                <el-form-item label="任务命令" required>
                    <el-input type="textarea" v-model="form.command" placeholder="请输入执行的命令"></el-input>
                </el-form-item>
                <el-form-item label="执行用户">
                    <el-input v-model="form.command_user" placeholder="默认root身份执行，仅对容器执行生效"></el-input>
                </el-form-item>
                <el-form-item label="执行对象" required>
                    <el-cascader style="margin-bottom: 10px; width: 100%" placeholder="请选择执行对象"
                                 v-for="(item, index) in targets"
                                 :key="index"
                                 :options="options"
                                 v-model="targets[index]"
                                 @active-item-change="loadNode"
                                 @change="handleChange"
                    ></el-cascader>
                </el-form-item>
                <el-row v-if="form.id" style="text-align: center">
                    <i style="color: #F7BA2A" class="el-icon-information">&nbsp;如果修改任务详情、执行用户或执行对象，则需要重启任务后才会生效！</i>
                </el-row>
            </el-form>
            <div slot="footer">
                <el-button @click="dialogAddVisible=false">取消</el-button>
                <el-button @click="targets.push([])">添加执行对象</el-button>
                <el-button type="primary" @click="saveCommit" :loading="btnSaveLoading">保存</el-button>
            </div>
        </el-dialog>
        <el-dialog title="调度历史记录" width="80%" :visible.sync="dialogLogVisible">
            <el-table :data="logTableData" height="500" v-loading="logTableLoading" style="width: 100%">
                <el-table-column prop="created" label="调度时间" width="180"></el-table-column>
                <el-table-column prop="target" label="执行对象" width="120"></el-table-column>
                <el-table-column label="执行耗时" width="120">
                    <template slot-scope="scope">
                        <span>{{scope.row.time_cost}} s</span>
                    </template>
                </el-table-column>
                <el-table-column label="执行结果">
                    <template slot-scope="scope">
                        <el-tag v-if="scope.row.exit_code === 0" type="success">成功</el-tag>
                        <el-tooltip v-else :content="`Exit code ${scope.row.exit_code}`">
                            <el-tag type="danger">失败</el-tag>
                        </el-tooltip>
                    </template>
                </el-table-column>
                <el-table-column prop="stdout" label="标准输出">
                    <template slot-scope="scope">
                        <el-tooltip placement="left">
                            <div slot="content" v-html="scope.row.stdout"></div>
                            <nobr>{{scope.row.stdout}} </nobr>
                        </el-tooltip>
                    </template>
                </el-table-column>
                <el-table-column prop="stderr" label="错误输出">
                    <template slot-scope="scope">
                        <el-tooltip placement="left">
                            <div slot="content" v-html="scope.row.stderr"></div>
                            <nobr>{{scope.row.stderr}}</nobr>
                        </el-tooltip>
                    </template>
                </el-table-column>
            </el-table>
        </el-dialog>
        <job-setting v-if="dialogSetVisible" :form="form" @close="closeSet"></job-setting>
    </div>
</template>

<script>
    import JobSetting from './JobSetting.vue'
    export default {
        components: {
            JobSetting,
            'job-setting': JobSetting
        },
        data() {
            return {
                dialogAddVisible: false,
                dialogSetVisible: false,
                dialogLogVisible: false,
                btnSaveLoading: false,
                btnSwitchLoading: {},
                tableLoading: false,
                tableData: [],
                logTableLoading: false,
                logTableData: [],
                hosts: undefined,
                job_group: '',
                currentPage: 1,
                form: {
                    group: ''
                },
                targets: [[]],
                groups: [],
                options: [
                    {label: '本地', value: 'local'},
                    {label: '主机', value: 'host', children: []},
                    {label: '容器', value: 'container', children: []},
                    {label: '删除', value: 'delete', disabled: true}
                ]
            }
        },
        methods: {
            handleCurrentChange(val) {
                this.currentPage = val;
                this.fetch(this.currentPage);
            },

            //获取任务分组
            get_job_group () {
                this.$http.get('/api/schedule/jobs/groups/').then(res => {
                    this.groups = res.result
                }, res => this.$layer_message(res.result))
            },

            //刷新操作
            refresh(){
                this.fetch(this.currentPage);
            },

            //分组查询
            group_Search(){
                this.currentPage = 1;
                this.fetch();
            },

            //获取任务列表
            fetch(page) {
                if (!page) page = 1;
                this.tableLoading = true;
                this.$http.get('/api/schedule/jobs/', {
                    params: {
                        page: page,
                        job_group: this.job_group
                    }
                }).then((response) => {
                    this.tableData = response.result;
                }, (response) => this.$layer_message(response.result)).finally(() => this.tableLoading = false)
            },


            addOpen () {
                this.form = {group: ''};
                this.targets = [[]];
                this.clear_disabled(this.options);
                this.dialogAddVisible = true
            },
            saveCommit () {
                this.btnSaveLoading = true;
                let tmp = this.targets.map(x => {
                    if (x.length === 1) {
                        return x[0]
                    } else if (x.length === 2) {
                        return x[1]
                    } else if (x.length === 3) {
                        return x.slice(1, 3).join('_')
                    }
                });
                this.form['targets'] = tmp.join(',');
                let request;
                if (this.form.id) {
                    request = this.$http.put(`/api/schedule/jobs/${this.form.id}`, this.form)
                } else {
                    request = this.$http.post('/api/schedule/jobs/', this.form)
                }
                request.then(() => {
                    this.dialogAddVisible = false;
                    this.$layer_message('提交成功', 'success');
                    this.fetch(this.currentPage);
                    this.get_job_group();
                }, res => this.$layer_message(res.result)).finally(() => this.btnSaveLoading = false)
            },
            loadContainer (val) {
                if (val.length > 1) {
                    let item = this.options[2].children.find((x) => x.value === val[1]);
                    if (item.hasOwnProperty('is_load')) return;
                    this.$http.get(`/api/deploy/containers/${val[1]}/`).then(res => {
                        item['is_load'] = true;
                        let apps = res.result['apps'];
                        let envs = res.result['envs'];
                        item.children = res.result['relationships'].map(x => Object({
                            label: `${apps[x.app_id]['name']} - ${envs[x.env_id]['name']}`,
                            value: `${x.app_id}_${x.env_id}`
                        }));
                        if (item.children.length === 0) item.disabled = true;
                    }, res => this.$layer_message(res.result))
                }
            },
            loadNode (val) {
                if (this.hosts === undefined) {
                    this.$http.get('/api/assets/hosts/').then(res => {
                        this.hosts = res.result.data.map(x => Object({label: x.name, value: x.id + ''}));
                        this.options[1].children = this.hosts;
                        this.options[2].children = this.$deepCopy(this.hosts).map(x => Object.assign(x, {children: []}));
                        this.loadContainer(val)
                    }, res => this.$layer_message(res.result))
                } else {
                    this.loadContainer(val)
                }

            },
            clear_disabled (data) {
                for (let item of data) {
                    if (item.hasOwnProperty('children')) {
                        this.clear_disabled(item['children'])
                    } else {
                        item['disabled'] = false
                    }
                }
                this.options[3]['disabled'] = this.targets.length <= 1;
            },
            handleChange () {
                this.clear_disabled(this.options);
                for (let val of this.targets) {
                    if (val[0] === 'local') {
                        this.options[0]['disabled'] = true
                    } else if (val[0] === 'host') {
                        this.options[1].children.find(x => x.value === val[1])['disabled'] = true
                    } else if (val[0] === 'container') {
                        let sub = this.options[2].children.find(x => x.value === val[1])['children'];
                        sub.find(x => x.value === val[2])['disabled'] = true
                    } else if (val[0] === 'delete') {
                        this.targets.splice(this.targets.indexOf(val), 1)
                    }
                }
            },
            do_action (command) {
                let [action, index] = command.split(' ');
                this.form = this.$deepCopy(this.tableData.data[index]);
                if (action === 'edit') {
                    this.targets = this.form.targets.split(',').map(x => {
                        if (x === 'local') {
                            return [x]
                        } else if (x.includes('_')) {
                            let tmp = x.split('_');
                            return ['container', tmp[0], `${tmp[1]}_${tmp[2]}`]
                        } else {
                            return ['host', x]
                        }
                    });
                    this.options[3]['disabled'] = this.targets.length <= 1;
                    this.targets.map(x => this.loadNode(x));
                    this.dialogAddVisible = true
                } else if (action === 'del') {
                    this.$confirm(`此操作将永久删除 ${this.form.name}，是否继续？`, '删除确认', {type: 'warning'}).then(() => {
                        this.$http.delete(`/api/schedule/jobs/${this.form.id}`).then(() => {
                            this.fetch(this.currentPage);
                        }, res => this.$layer_message(res.result))
                    }).catch(() => {
                    })
                } else if (action === 'set') {
                    this.dialogSetVisible = true
                } else if (action === 'log') {
                    this.dialogLogVisible = true;
                    this.logTableLoading = true;
                    this.$http.get(`/api/schedule/histories/${this.form.id}`).then(res => {
                        this.logTableData = res.result
                    }, res => this.$layer_message(res.result)).finally(() => this.logTableLoading = false)
                }
            },
            do_switch (row) {
                this.btnSwitchLoading = {[row.id]: true};
                let request;
                if (row.enabled) {
                    request = this.$http.delete(`/api/schedule/jobs/${row.id}/switch`)
                } else {
                    request = this.$http.post(`/api/schedule/jobs/${row.id}/switch`)
                }
                request.then(() => this.fetch(this.currentPage), res => this.$layer_message(res.result)).finally(() => this.btnSwitchLoading = {})
            },
            closeSet () {
                this.dialogSetVisible = false;
                this.fetch(this.currentPage);
            },
            handleTagType (val) {
                if (val === '异常') {
                    return 'danger'
                } else if (val === '未启用') {
                    return 'info'
                } else if (val === '已过期') {
                    return 'warning'
                } else {
                    return 'success'
                }
            },
            addGroup () {
                this.$prompt('请输入任务分组名称', '提示', {
                    inputPattern: /.+/,
                    inputErrorMessage: '请输入分组名称！'
                }).then(({value}) => {
                    this.form.group = value
                }).catch(() => {
                })
            }

        },
        created () {
            this.fetch(),
            this.get_job_group()
        }
    }
</script>