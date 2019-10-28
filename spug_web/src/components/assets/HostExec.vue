<template>
    <el-tabs v-model="activeName" type="card" @tab-click="handleClick">
        <el-tab-pane label="批量执行" name="first">
            <div style="margin: 10px 0">执行主机： </div>
            <el-input disabled type="textarea" required placeholder="目标主机IP,多个用逗号分隔" v-model="selected_host">
            </el-input>
            <div style="margin: 10px 0">
                <el-button @click="select_host_view">从主机列表中选择<i class="el-icon-plus el-icon--right"></i></el-button>
            </div>
            <div style="margin: 10px 0">执行命令： </div>
            <color-input v-model="exec_command" required></color-input>
            <div style="margin: 10px 0">
                <el-button @click="select_exec_tpl_view" plain>从执行模板中选择<i class="el-icon-plus el-icon--right"></i></el-button>
            </div>
            <el-button type="primary" v-if="has_permission('assets_host_exec')"
                       :disabled="is_disabled" @click="start_exec_command">开始执行</el-button>
        </el-tab-pane>

        <el-tab-pane label="执行模板" name="second">
            <el-row>
                <el-col :span="16">
                    <el-form :inline="true" :model="tpl_query">
                        <el-form-item>
                            <el-input v-model="tpl_query.name_field" clearable placeholder="请输入模板名称"></el-input>
                        </el-form-item>
                        <el-select v-model="tpl_query.type_field" placeholder="模板类型" clearable>
                            <el-option v-for="v in tpl_options" :value="v" :key="v"></el-option>
                        </el-select>
                        <el-form-item>
                            <el-button type="primary" icon="search" @click="t_name_search()">查询</el-button>
                        </el-form-item>
                    </el-form>
                </el-col>
                <el-col :span="8" style="text-align: right">
                    <el-button @click="get_tpl()">刷新</el-button>
                    <el-button v-if="has_permission('assets_host_exec_tpl_add')" style="float: right" type="primary"
                               @click="add_exec_tpl()">添加模板
                    </el-button>
                </el-col>
            </el-row>

            <el-table :data="tpl.data"  v-loading="tableLoading" style="width: 100%; margin-top: 20px">
                <el-table-column prop="tpl_name" label="模板名称"></el-table-column>
                <el-table-column prop="tpl_type" label="模板类型"></el-table-column>
                <el-table-column prop="tpl_content" label="模板内容"  :show-overflow-tooltip="true"></el-table-column>
                <el-table-column prop="tpl_desc" label="描述"></el-table-column>
                <el-table-column label="操作" width="220px" v-if="has_permission('assets_host_exec_tpl_edit|assets_host_exec_tpl_del')">
                    <template slot-scope="scope">
                        <el-button v-if="has_permission('assets_host_exec_tpl_edit')" size="small" @click="edit_exec_tpl(scope.row)">编辑</el-button>
                        <el-button v-if="has_permission('assets_host_exec_tpl_del')" size="small" type="danger" @click="del_exec_tpl(scope.row)"
                                   :loading="btnDelLoading[scope.row.id]">删除
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>

            <!--分页-->
            <div class="pagination-bar" v-if="tpl.total > 10">
                <el-pagination
                        @current-change="handleCurrentChange"
                        :current-page="currentPage"  layout="total, prev, pager, next"
                        :total="tpl.total">
                </el-pagination>
            </div>
        </el-tab-pane>

        <el-dialog title="主机列表" :visible.sync="dialog_host_view" width="80%" :close-on-click-modal="false">
            <el-row>
                <el-col :span="16">
                    <!--<el-select v-model="host_zone" @change="zone_Search()" clearable placeholder="区域">-->
                    <!--<el-option v-for="item in zone_options" :key="item" :value="item"></el-option>-->
                    <!--</el-select>-->
                    <el-form :inline="true" :model="host_query">
                        <el-form-item>
                            <el-input v-model="host_query.name_field" clearable placeholder="主机名称"></el-input>
                        </el-form-item>
                        <el-select v-model="host_query.zone_field" @change="zone_Search()" clearable placeholder="区域">
                            <el-option v-for="item in zone_options" :key="item" :value="item"></el-option>
                        </el-select>

                        <el-form-item>
                            <el-button type="primary" icon="search" @click="get_hosts()">查询</el-button>
                        </el-form-item>
                    </el-form>
                </el-col>
            </el-row>
            <el-table :data="hosts.data"  ref="multipleTable"  v-loading="hostLoading" @selection-change="handleSelectionChange"
                      @row-click="handleClickRow" style="width: 100%">
                <el-table-column type="selection" width="50">
                </el-table-column>
                <el-table-column prop="name" label="主机名称"></el-table-column>
                <el-table-column prop="zone" label="所属区域"></el-table-column>
                <el-table-column prop="type" label="类型"></el-table-column>
                <el-table-column prop="ssh_ip" label="SSH连接"></el-table-column>
            </el-table>
            <!--主机列表分页-->
            <div class="pagination-bar" v-if="hosts.total > 10">
                <el-pagination
                        @current-change="hostCurrentChange"
                        :current-page="hostCurrentPage" layout="total, prev, pager, next"
                        :total="hosts.total">
                </el-pagination>
            </div>
            <div slot="footer">
                <el-button @click="dialog_host_view=false">取消</el-button>
                <el-button type="primary" @click="save_select_host">确定</el-button>
            </div>
        </el-dialog>

        <!--模板编辑新增界面-->
        <el-dialog :title="FormTitle" :visible.sync="host_tpl_edit_view" :close-on-click-modal="false">
            <el-form ref="editForm" :model="editTpl" :rules="rules" label-width="80px">
                <el-form-item prop="tpl_name" label="模板名称" required>
                    <el-input v-model="editTpl.tpl_name" auto-complete="off" ></el-input>
                </el-form-item>
                <el-form-item label="模板类型" prop="tpl_type" required>
                    <el-select v-model="editTpl.tpl_type" placeholder="模板类型">
                        <el-option v-for="v in tpl_options" :value="v" :key="v"></el-option>
                    </el-select>
                    <el-button style="margin-left: 15px" type="text" @click="addtplType">添加类型</el-button>
                </el-form-item>
                <el-form-item prop="tpl_content" label="模板内容" required>
                    <color-input v-model="editTpl.tpl_content"></color-input>
                </el-form-item>
                <el-form-item prop="tpl_desc" label="模板描述">
                    <el-input v-model="editTpl.tpl_desc" auto-complete="off"></el-input>
                </el-form-item>
            </el-form>
            <div slot="footer">
                <el-button type="text" @click.native="host_tpl_edit_view = false">取消</el-button>
                <el-button type="primary" :loading="editLoading" @click.native="saveTplCommit">保存</el-button>
            </div>
        </el-dialog>

        <el-dialog title="执行模板" :visible.sync="dialog_exec_tpl_view" :close-on-click-modal="false" width="80%">
            <el-row>
                <el-col :span="16">
                    <el-form :inline="true" :model="tpl_query">
                        <el-form-item>
                            <el-input v-model="tpl_query.name_field" clearable placeholder="请输入模板名称"></el-input>
                        </el-form-item>

                        <el-select v-model="tpl_query.type_field" placeholder="模板类型">
                            <el-option v-for="v in tpl_options" :value="v" :key="v"></el-option>
                        </el-select>
                        <el-form-item>
                            <el-button type="primary" icon="search" @click="t_name_search()">查询</el-button>
                        </el-form-item>
                    </el-form>
                </el-col>
            </el-row>

            <el-table ref="singleTable" highlight-current-row :data="tpl.data"
                      @current-change="handleSelectChange"
                      v-loading="tableLoading" style="width: 100%; margin-top: 20px">
                <el-table-column prop="tpl_name" label="模板名称"></el-table-column>
                <el-table-column prop="tpl_type" label="模板类型"></el-table-column>
                <el-table-column prop="tpl_content" label="模板内容"  :show-overflow-tooltip="true"></el-table-column>
                <el-table-column prop="tpl_desc" label="描述"></el-table-column>
            </el-table>
            <div slot="footer">
                <el-button @click="dialog_exec_tpl_view=false">取消</el-button>
                <el-button type="primary" @click="save_select_exec_tpl">确定</el-button>
            </div>
        </el-dialog>

        <el-dialog title="执行详情" style="width: 100%" :visible.sync="dialog_exec_detail_view" :close-on-click-modal="false" @close="delete_exec">
            <el-collapse>
                <el-collapse-item v-for="i in multipleSelection" :key="i.ip" :name="i.ip">
                    <template slot="title">
                        <el-tag type="info" style="margin-right: 15px">{{`${i.name}(${i.ssh_ip}:${i.ssh_port})`}}</el-tag>
                    </template>
                    <pre>** 开始执行 **

                        <template v-for="line in exec_output"><span v-if="line[`${i.ssh_ip}:${i.ssh_port}`]">{{line[`${i.ssh_ip}:${i.ssh_port}`]}}</span></template>
                    </pre>
                </el-collapse-item>
            </el-collapse>
        </el-dialog>


    </el-tabs>
</template>
<script>
    import ColorInput from '../publish/ColorInput.vue'
    export default {
        components: {
            'color-input': ColorInput
        },
        data() {
            return {
                activeName: 'first',
                hosts: [],
                tpl:[],
                currentPage: 1,
                hostCurrentPage: 1,
                tpl_query: {
                    name_field: '',
                    type_field: '',
                },
                host_query: {
                    name_field: '',
                    zone_field: '',
                },
                tableLoading: false,
                hostLoading: true,
                editLoading:false,
                btnDelLoading: {},
                exec_command: '',
                selected_host: '',
                host_zone: '',
                zone_options: [],
                dialog_host_view: false,
                dialog_exec_tpl_view: false,
                dialog_exec_detail_view: false,
                multipleSelection: [],
                selected_host_id: [],
                t_name_value:'',
                FormTitle:'添加模板',
                host_tpl_edit_view: false,
                selectTplRow: null,
                exec_output: [],
                editTpl:{},
                socket: undefined,
                exec_token: null,
                addTpl: {
                    tpl_name: '',
                    tpl_desc: '',
                    tpl_type: '',
                    tpl_content: '',
                },
                tpl_options:[],
                rules: {
                    tpl_name: [
                        {required: true, message: '请输入模板名称', trigger: 'blur'}
                    ],
                    tpl_type: [
                        {required: true, message: '请输入模板类型', trigger: 'blur'}
                    ],
                    tpl_content:[
                        {required: true, message: '请输入模板内容', trigger: 'blur'}
                    ],
                },
            };
        },
        computed: {
            is_disabled() {
                return ! this.exec_command.replace(' ', '') || ! this.selected_host
            }
        },
        methods: {
            handleClick(tab, event) {
                if (tab.name === "second"){
                    this.get_tpl();
                    this.get_tpl_type();
                }
            },
            handleClickRow(row) {
                this.$refs.multipleTable.toggleRowSelection(row)
            },
            get_hosts (page) {
                if (!page) page = 1;
                this.hostLoading = true;
                let api_uri = '/api/assets/hosts/';
                this.$http.get(api_uri, {params: {page: page, host_query: this.host_query}}).then(res => {
                    this.hosts = res.result
                }, res => this.$layer_message(res.result)).finally(() => this.hostLoading = false)
            },
            get_tpl (page) {
                if (!page) page = 1;
                this.tableLoading = true;
                let api_uri = '/api/assets/hosts_exec/tpl/';
                this.$http.get(api_uri, {params: {page: page, tpl_query: this.tpl_query}}).then(res => {
                    this.tpl = res.result
                }, res => this.$layer_message(res.result)).finally(() => this.tableLoading = false)
            },
            //区域查询
            zone_Search(){
                this.get_hosts();
            },
            //获取区域
            get_host_zone () {
                this.$http.get('/api/assets/hosts/zone/').then(res => {
                    this.zone_options = res.result
                }, res => this.$layer_message(res.result))
            },
            select_host_view () {
                this.dialog_host_view = true;
                this.get_hosts();
                this.get_host_zone();
            },
            select_exec_tpl_view () {
                this.dialog_exec_tpl_view = true;
                this.get_tpl();
                this.get_tpl_type();
            },
            add_exec_tpl(){
                this.host_tpl_edit_view = true;
                this.editTpl = this.addTpl;
            },
            edit_exec_tpl (row) {
                this.editTpl = this.$deepCopy(row);
                this.host_tpl_edit_view = true;
                this.title = '编辑模板';
                this.importStatus = false;
            },
            t_name_search(ev) {
                this.get_tpl();
            },
            handleSelectionChange(val) {
                this.multipleSelection = val;
            },
            save_select_host() {
                let hosts = [], hosts_id = [];
                for (let v of this.multipleSelection) {
                    hosts.push(`${v.name}(${v.ssh_ip}:${v.ssh_port})`);
                    hosts_id.push(v.id);
                }
                this.selected_host_id = hosts_id;
                this.selected_host = hosts.toString();
                this.dialog_host_view = false;
            },
            save_select_exec_tpl() {
                this.exec_command = this.selectTplRow.tpl_content;
                this.dialog_exec_tpl_view = false;
            },
            start_exec_command () {
                this.dialog_exec_detail_view = true;
                this.exec_output = [];
                let data = {hosts_id: this.selected_host_id, command: this.exec_command};
                this.$http.post(`/api/assets/hosts_exec/exec_command`,data).then(res => {
                    this.exec_token = res.result;
                    this.fetchExecResult();
                });
            },
            fetchExecResult() {
                this.$http.get(`/api/common/queue/state/${this.exec_token}`).then(res => {
                    if (res.result['complete'] === true) return;
                    this.fetchExecResult(this.exec_token);
                    this.exec_output.push(res.result);
                }, res => this.$layer_message(res.result))
            },
            delete_exec () {
                this.$http.delete(`/api/assets/hosts_exec/exec_command/${this.exec_token}`)
                    .then(() => {}, res => {
                        this.$layer_message(res.result)
                    })
            },
            saveTplCommit () {
                this.editLoading = true;
                let request;
                if (this.editTpl.id) {
                    request = this.$http.put(`/api/assets/hosts_exec/tpl/${this.editTpl.id}`, this.editTpl)
                } else {
                    request = this.$http.post(`/api/assets/hosts_exec/tpl/`, this.editTpl)
                }
                request.then(() => {
                    this.host_tpl_edit_view = false;
                    this.$layer_message('提交成功', 'success');
                    this.get_tpl(this.currentPage);
                    this.get_tpl_type();
                    this.addTpl = { tpl_name: '', tpl_desc: '', tpl_type: '', tpl_content: ''};
                }, res => this.$layer_message(res.result)).finally(() => this.editLoading = false)
            },
            addtplType () {
                this.$prompt('请输入模板类型', '提示', {
                    inputPattern: /.+/,
                    inputErrorMessage: '请输入类型！'
                }).then(({value}) => {
                    this.editTpl.tpl_type = value
                }).catch(() => {
                })
            },
            del_exec_tpl (row) {
                this.$confirm('确认删除吗?', '警告', {
                    type: 'warning'
                }).then(() => {
                    this.btnDelLoading = {[row.id]: true};
                    this.$layer_message('删除成功', 'success');
                    this.$http.delete(`/api/assets/hosts_exec/tpl/${row.id}`)
                        .then(() => this.get_tpl(), res => this.$layer_message(res.result))
                        .finally(() => this.btnDelLoading = {})
                }).catch(() => {
                });
            },
            //获取区域
            get_tpl_type () {
                this.$http.get('/api/assets/hosts_exec/tpl_type').then(res => {
                    this.tpl_options = res.result
                }, res => this.$layer_message(res.result))
            },
            handleSelectChange(val){
                this.selectTplRow = val;
            },
            handleCurrentChange(val) {
                this.currentPage = val;
                this.get_tpl(this.currentPage);
            },
            hostCurrentChange(val) {
                this.hostCurrentPage = val;
                this.get_hosts(this.hostCurrentPage);
            },
        },

    };
</script>
