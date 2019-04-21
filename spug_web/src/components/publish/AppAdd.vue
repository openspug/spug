<template>
    <div>
        <el-steps :active="appStep">
            <el-step title="项目信息" description="基本信息"></el-step>
            <el-step title="容器设置" description="容器启动端口,目录,主机名等设置"></el-step>
            <el-step title="容器变量" description="容器内部参数变量设置"></el-step>
            <el-step title="发布参数" description="容器启动,项目更新部署相关设置"></el-step>
            <el-step title="主机设置" description="部署的主机"></el-step>
            <el-step title="完成" description="确认配置信息"></el-step>
        </el-steps>

        <p style="text-align: center; margin: 30px 0 20px"></p>
        <div :style="base_display">
            <el-form ref="appInfo" :model="appInfo" :rules="baseRules"  label-width="80px">
                <el-form-item label="项目类型" prop="group" required>
                    <el-select v-model="appInfo.group" placeholder="项目类型">
                        <el-option v-for="v in group_options" :value="v" :key="v"></el-option>
                    </el-select>
                    <el-button style="margin-left: 15px" type="text" @click="addAppType">添加项目类型</el-button>
                </el-form-item>
                <el-form-item prop="name" label="项目名称" required>
                    <el-input v-model="appInfo.name" auto-complete="off" ></el-input>
                </el-form-item>
                <el-form-item label="关联镜像" >
                    <el-cascader  placeholder="输入要搜索的镜像" clearable
                                  :options="app_images_options" filterable
                                  @focus="fetch_images_options"
                                  @change="bindImageTag"
                                  @active-item-change="loadImageTag" >
                        <!--@active-item-change="loadImageTag" >-->
                    </el-cascader>
                </el-form-item>
                <el-form-item prop="desc" label="项目描述">
                    <el-input v-model="appInfo.desc" auto-complete="off"></el-input>
                </el-form-item>
            </el-form>
        </div>
        <!--<p style="text-align: center; margin: 20px 0 20px"></p>-->
        <div>
            <el-table :data="dockerData" border style="width: 100%" :style="docker_display">
                <el-table-column fixed prop="desc" label="名称" ></el-table-column>
                <el-table-column v-for="item in this.environments" :key="item.id" :label="item.name" show-overflow-tooltip>
                    <template slot-scope="scope">
                        <span v-if="scope.row.value[item.id]">{{scope.row.value[item.id]}}</span>
                        <span v-else style="color: #D3DCE6">{{scope.row.tip}}</span>
                    </template>
                </el-table-column>
                <el-table-column fixed="right" label="操作" width="80px" v-if="has_permission('publish_app_ctr_edit')">
                    <template slot-scope="scope">
                        <el-button size="small" type="primary"
                                   @click="dockerForm = scope.row; dockerVisible = true">编辑
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
            <el-dialog :title="`设置 - ${dockerForm.desc}`" :visible.sync="dockerVisible" :close-on-click-modal="false">
                <el-form :model="dockerForm" label-width="80px" label-position="left">
                    <el-form-item v-for="env in this.environments" :key="env.id" :label="env.name">
                        <el-input v-model="dockerForm.value[env.id]" :placeholder="dockerForm.tip"></el-input>
                    </el-form-item>
                </el-form>
                <div slot="footer">
                    <el-button @click="dockerVisible = false">取消</el-button>
                    <el-button type="primary" @click="dockerVisible = false" :loading="dockerSaveLoading">保存</el-button>
                </div>
            </el-dialog>
        </div>
        <div :style="env_display">
            <el-table :data="envData" border style="width: 100%"  >
                <el-table-column fixed prop="name" label="名称"  show-overflow-tooltip></el-table-column>
                <el-table-column v-for="item in this.environments" :key="item.id" :label="item.name" show-overflow-tooltip>
                    <template slot-scope="scope">
                        <span v-if="scope.row.value[item.id]">{{scope.row.value[item.id]}}</span>
                    </template>
                </el-table-column>
                <el-table-column prop="desc" label="描述"  show-overflow-tooltip></el-table-column>
                <el-table-column fixed="right" label="操作"  v-if="has_permission('publish_app_var_edit|publish_app_var_del')">
                    <template slot-scope="scope">
                        <el-button v-if="has_permission('publish_app_var_edit')" size="small" @click="editEnv(scope.row)">编辑</el-button>
                        <el-button v-if="has_permission('publish_app_var_del')" size="small" type="danger" @click="delEnv(scope.row)"
                                   :loading="envDelLoading[scope.row.id]">
                            删除
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
            <p style="text-align: center; margin: 20px 0 20px"></p>
            <div slot="footer" style="text-align: right">
                <el-button v-if="has_permission('publish_app_var_add')" type="primary" @click="addEnv">新建</el-button>
            </div>
            <el-dialog title="编辑配置" :visible.sync="envVisible" :close-on-click-modal="false">
                <el-form :model="envForm" label-width="80px" label-position="left">
                    <el-form-item label="名称" required>
                        <el-input v-model="envForm.name" placeholder="请输入变量名称"></el-input>
                    </el-form-item>
                    <el-form-item label="描述" >
                        <el-input v-model="envForm.desc" type="textarea" placeholder="请输入变量描述"></el-input>
                    </el-form-item>
                    <el-form-item v-for="env in environments" :key="env.id" :label="env.name" required>
                        <el-input v-model="envForm.value[env.id]" placeholder="请输入变量值"></el-input>
                    </el-form-item>
                </el-form>
                <div slot="footer">
                    <el-button @click="envVisible = false">取消</el-button>
                    <el-button type="primary" @click="envSave" :loading="envSaveLoading">保存</el-button>
                </div>
            </el-dialog>
        </div>
        <div :style="menu_display">
            <el-table :data="menuData" >
                <el-table-column prop="name" label="菜单名称" show-overflow-tooltip></el-table-column>
                <el-table-column prop="desc" label="菜单描述" show-overflow-tooltip></el-table-column>
                <el-table-column prop="command" label="菜单命令" show-overflow-tooltip></el-table-column>
                <el-table-column label="操作" v-if="has_permission('publish_app_menu_view')">
                    <template slot-scope="scope">
                        <el-button size="small" type="primary" @click="menuEditOpen(scope.row)">编辑</el-button>
                    </template>
                </el-table-column>
            </el-table>
            <el-dialog title="应用发布" :title="menuDialogTitle" :visible.sync="menuVisible"  :close-on-click-modal="false">
                <el-form :model="menuForm" label-width="80px" label-position="left">
                    <el-form-item label="命令内容">
                        <color-input v-model="menuForm.command"></color-input>
                    </el-form-item>
                </el-form>
                <div slot="footer">
                    <el-button @click="menuVisible = false">取消</el-button>
                    <el-button v-if="has_permission('publish_app_menu_edit')" type="primary" @click="menuSave"
                               :loading="menuSaveLoading">保存</el-button>
                </div>
            </el-dialog>
        </div>

        <host-relationship :style="host_display" :owner="environments" ></host-relationship>
        <!--<template>-->
            <!--&lt;!&ndash;<div style="text-align: left" :style="host_display">&ndash;&gt;-->
            <!--<div :style="host_display">-->
                <!--<el-select placeholder="请选择环境" v-model="env_id" style="margin-bottom: 15px" >-->
                    <!--<el-option v-for="item in environments" :key="item.id" :value="item.id" :label="item.name"></el-option>-->
                <!--</el-select>-->
                <!--<el-transfer-->
                        <!--v-model="deploy_host" :props="{key: 'key',label: 'name'}"-->
                        <!--filterable-->
                        <!--:titles="['未选主机', '已选主机']"-->
                        <!--:filter-method="hostSearch"-->
                        <!--:data="ecs_host" >-->
                    <!--&lt;!&ndash;<span slot-scope="{ option }">{{ option.key }} - [ {{ option.name }} ]</span>&ndash;&gt;-->
                <!--</el-transfer>-->
            <!--</div>-->
        <!--</template>-->

        <div :style="complete_display">
            <el-card class="box-card">
                <div slot="header" class="clearfix">
                    <span>项目信息:</span>
                </div>
                <div class="text item">
                    {{'项目类型 ' +  appInfo.group }}
                    {{'项目名称 ' +  appInfo.name }}
                    {{'关联镜像 ' +  appInfo.image_tag_name }}
                    <p v-if="appInfo.desc">{{'项目描述 ' +  appInfo.desc }}</p>
                </div>
            </el-card>
            <p style="text-align: center; margin: 5px 0 5px"></p>
            <el-card class="box-card">
                <div slot="header" class="clearfix">
                    <span>容器设置:</span>
                </div>
                <div  class="text item">
                    <el-table :data="dockerData" border style="width: 100%" >
                        <el-table-column fixed prop="desc" label="名称" ></el-table-column>
                        <el-table-column v-for="item in this.environments" :key="item.id" :label="item.name" show-overflow-tooltip>
                            <template slot-scope="scope">
                                <span v-if="scope.row.value[item.id]">{{scope.row.value[item.id]}}</span>
                                <span v-else style="color: #D3DCE6">{{scope.row.tip}}</span>
                            </template>
                        </el-table-column>
                    </el-table>
                </div>
            </el-card>
            <p style="text-align: center; margin: 5px 0 5px"></p>
            <el-card class="box-card">
                <div slot="header" class="clearfix">
                    <span>容器参数:</span>
                </div>
                <div class="text item">
                    <el-table :data="envData" border style="width: 100%"  >
                        <el-table-column fixed prop="name" label="名称"  show-overflow-tooltip></el-table-column>
                        <el-table-column v-for="item in this.environments" :key="item.id" :label="item.name" show-overflow-tooltip>
                            <template slot-scope="scope">
                                <span v-if="scope.row.value[item.id]">{{scope.row.value[item.id]}}</span>
                            </template>
                        </el-table-column>
                        <el-table-column prop="desc" label="描述"  show-overflow-tooltip></el-table-column>
                    </el-table>
                </div>
            </el-card>
            <p style="text-align: center; margin: 5px 0 5px"></p>
            <el-card class="box-card">
                <div slot="header" class="clearfix">
                    <span>发布设置:</span>
                </div>
                <div class="text item">
                    <el-table :data="menuData" >
                        <el-table-column prop="name" label="菜单名称" show-overflow-tooltip></el-table-column>
                        <el-table-column prop="desc" label="菜单描述" show-overflow-tooltip></el-table-column>
                        <el-table-column prop="command" label="菜单命令" show-overflow-tooltip></el-table-column>
                    </el-table>
                </div>
            </el-card>
            <p style="text-align: center; margin: 5px 0 5px"></p>
            <el-card class="box-card">
                <div slot="header" class="clearfix">
                    <span>主机信息:</span>
                </div>
                <div v-for="n in deploy_host" :key="n" class="text item">
                    {{'主机ID: ' +  n }}
                </div>
            </el-card>

        </div>

        <el-dialog title="应用发布" :visible.sync="dialogDeployVisible" width="80%"
                   :close-on-click-modal="false">
            <el-collapse :value="showItem" accordion>
                <el-collapse-item v-for="item in updateHosts" :key="item.id" :name="item.id">
                    <template slot="title">
                        <el-tag :type="item.type" style="margin-right: 15px">{{item.instance_name}}</el-tag>
                        {{item.latest}}
                    </template>
                    <pre v-for="line in item.detail">{{line}}</pre>
                </el-collapse-item>
            </el-collapse>
        </el-dialog>

        <p style="text-align: center; margin: 20px 0 20px"></p>
        <el-button-group>

            <el-button type="primary"  :style="base_display" @click="baseNext('appInfo')">下一步
                <i class="el-icon-arrow-right el-icon--right"></i></el-button>
            <el-button type="primary"   :style="docker_display" @click="basePrev" icon="el-icon-arrow-left">上一步</el-button>
            <el-button type="primary"  :style="docker_display" @click="dockerNext">下一步<i class="el-icon-arrow-right el-icon--right"></i></el-button>

            <el-button type="primary"   :style="env_display" @click="dockePrev" icon="el-icon-arrow-left">上一步</el-button>
            <el-button type="primary"  :style="env_display" @click="envNext" >下一步<i class="el-icon-arrow-right el-icon--right"></i></el-button>

            <el-button type="primary"  :style="menu_display" @click="envPrev" icon="el-icon-arrow-left">上一步</el-button>
            <el-button type="primary"  :style="menu_display" @click="menuNext" >下一步<i class="el-icon-arrow-right el-icon--right"></i></el-button>

            <el-button type="primary"  :style="host_display" @click="menuPrev" icon="el-icon-arrow-left">上一步</el-button>
            <el-button type="primary"  :style="host_display" @click="host_next" >下一步<i class="el-icon-arrow-right el-icon--right"></i></el-button>

            <el-button type="primary"   :style="complete_display" @click="host_prev" icon="el-icon-arrow-left">上一步</el-button>
            <el-button type="primary"  :style="complete_display" :loading="CompleteLoading" @click="complete_next">开始部署
                <i class="el-icon-arrow-right el-icon--right"></i></el-button>
            <el-button type="primary"  :style="dep_display" @click="dep_prev" icon="el-icon-arrow-left">上一步</el-button>


        </el-button-group>
    </div>
</template>

<style>
    .transfer-footer {
        margin-left: 20px;
        padding: 6px 5px;
    }
</style>


<script>
    import ColorInput from '../publish/ColorInput.vue'
    import HostRelationship from './HostRel.vue'

    export default {
        components: {
            'color-input': ColorInput,
            'host-relationship': HostRelationship
        },
        data () {
            return {
                appStep: 1,
                ecs_host: [],
                deploy_host: [],
                CompleteLoading: false,
                dockerSaveLoading: false,
                envSaveLoading: false,
                menuSaveLoading: false,
                envDelLoading: false,
                group_options:[],
                app_images_options: [],
                menuDialogTitle: '',
                appInfo: {
                    group: '',
                    name: '',
                },
                images: [],
                groups: [],
                updateHosts: [],
                dockerVisible: false,
                menuVisible: false,
                envVisible: false,
                dialogDeployVisible: false,
                base_display: '',
                host_display: 'display:none',
                complete_display: 'display:none',
                env_display: 'display:none',
                exec_display: 'display:none',
                docker_display: 'display:none',
                menu_display: 'display:none',
                dep_display: 'display:none',
                environments: undefined,
                env_id: '',
                exec_output: [],
                exec_token: null,
                dockerData: [
                    {value: {}, desc: '限制内存', name: '__MEM_LIMIT', tip: '默认无限制'},
                    {value: {}, desc: '网络模式', name: '__NETWORK_MODE', tip: 'default'},
                    {value: {}, desc: '映射端口', name: '__EXPOSE_PORT', tip: '示例：127.0.0.1:80:3000'},
                    {value: {}, desc: '映射目录', name: '__BIND_VOLUME', tip: '示例：/home/user1:/mnt/vol1:ro'},
                    {value: {}, desc: 'DNS地址', name: '__DNS_SERVER', tip: '示例：8.8.8.8;4.4.4.4'},
                    {value: {}, desc: '主机名称', name: '__HOST_NAME', tip: '默认随机名称'}
                ],
                dockerForm: {
                    value: {}
                },
                envData: [],
                // envData: [{value: {}, name: '', desc: ''}],
                envForm: {
                    name: '',
                    desc: '',
                    value: {}
                },
                menuData: [
                    {command: '',name: "容器初始化", desc: '容器被创建后，执行的初始化命令'},
                    {command: '',name: "应用发布", desc: '点击发布按钮，执行的更新命令'},
                    {command: '/usr/sbin/nginx -g "daemon off;"',name: "容器启动", desc: '容器启动时，执行的命令'},
                ],
                menuForm: {},
                baseRules: {
                    group: [
                        { required: true, message: '请选择项目类型', trigger: 'change' }
                    ],
                    name: [
                        { required: true, message: '请输入项目名称', trigger: 'blur' },
                    ],
                }

            };
        },
        computed: {
            showItem() {
                return (this.updateHosts.length === 1) ? this.updateHosts[0].id : ''
            },
            deployForm() {
                return {
                    appInfo: this.appInfo,
                    dockerData: this.dockerData,
                    envData: this.envData,
                    menuData: this.menuData,
                    host_ids: this.deploy_host.map(x => x.split(',')[0]),
                    env_id: this.env_id
                    // host_ids: this.deploy_host.map(x => x.id)
                }
            }
        },
        methods: {
            get_ecs_host () {
                // this.tableLoading = true;
                this.$http.get(`/api/assets/hosts/`,{params: {page: -1, host_query: {}}}).then(res => {
                    console.log('res.result.data', res.result.data);
                    for (let n of res.result.data){
                        const name = `${n.name} - ${n.ssh_ip}`;
                        this.ecs_host.push({
                            key: n.id + ',' + name,
                            name: name,
                            // label: `${ n.instance_name }`
                            // "ip": n.primary_ip,
                            // "n_type": n.instance_network_type,
                        })
                    }
                }, res => this.$layer_message(res.result)).finally(() => this.tableLoading = false)
            },
            hostSearch(query, item) {
                if (item.name){
                    return item.name.indexOf(query) > -1;
                }
            },
            handleChange(value, direction, movedKeys) {
                console.log(13, this.selectd_ng_host);
                console.log(value, 11, direction, 22, movedKeys);
            },
            fetchEnvironments () {
                if (this.environments === undefined) {
                    this.$http.get('/api/configuration/environments/').then(res => {
                        this.environments = res.result
                    }, res => this.$layer_message(res.result))
                }
            },
            fetchImages () {
                this.$http.get('/api/deploy/images/').then(res => this.images = res.result, res => this.$layer_message(res.result))
            },
            // saveCommit () {
            //     console.log('savedata', this.appInfo, this.deploy_host);
            //
            //     this.CompleteLoading = true;
            //     this.exec_display = 'display:block';
            //     this.$http.post('/api/deploy/pre_app/', {
            //         app_info: this.appInfo,
            //         deploy_host: this.deploy_host}).then(res => {
            //
            //         console.log('res.result', res.result);
            //         this.exec_token = res.result;
            //         this.fetchExecResult();
            //     }, res => this.$layer_message(res.result)).finally(() => this.CompleteLoading = false)
            //
            // },
            fetchExecResult() {
                this.$http.get(`/api/common/queue/state/${this.exec_token}`).then(res => {
                    if (res.result['complete'] === true) return;
                    this.fetchExecResult(this.exec_token);
                    console.log('fetcheexecresult', res.result);
                    this.exec_output.push(res.result);
                    console.log('this.exec_output', this.exec_output);
                }, res => this.$layer_message(res.result))
            },
            addOpen () {
                this.form = this.init_form();
                if (this.images.length === 0) this.fetchImages()
            },
            baseNext(baseName) {
                this.$refs[baseName].validate((valid) => {
                    if (valid) {
                        this.base_display = 'display:none';
                        this.docker_display = 'display:block';
                        this.appStep = 1;
                    } else {
                        return false;
                    }
                });
            },
            basePrev(){
                this.base_display = 'display:block';
                // this.host_display = 'display:none';
                this.docker_display = 'display:none';
                this.appStep = 0;
            },
            dockerNext(){
                this.docker_display = 'display:none';
                this.env_display = 'display:block';
                this.appStep = 2;
            },
            dockePrev(){
                this.docker_display = 'display:block';
                this.env_display = 'display:none';
                this.appStep = 1;
            },
            envNext(){
                this.env_display = 'display:none';
                this.menu_display = 'display:block';
                this.appStep = 3;
            },
            envPrev(){
                this.env_display = 'display:block';
                this.menu_display = 'display:none';
                this.appStep = 2;
            },
            menuNext(){
                this.menu_display = 'display:none';
                this.host_display = 'display:block';
                this.appStep = 4;
            },
            menuPrev(){
                this.menu_display = 'display:block';
                this.host_display = 'display:none';
                this.appStep = 3;
            },
            host_next(){
                this.host_display = 'display:none';
                this.complete_display = 'display:block';
                this.appStep = 5;
            },
            host_prev(){
                this.host_display = 'display:block';
                this.complete_display = 'display:none';
                this.appStep = 4;
            },
            dep_prev(){
                this.complete_display = 'display:block';
            },
            complete_next(){
                console.log(2003);
                // this.complete_display = 'display:none';
                // this.saveCommit()
                // this.dep_display = 'display:block';
                this.handleDeploy();

            },
            addGroup () {
                this.$prompt('请输入新分组名称', '提示', {
                    inputPattern: /.+/,
                    inputErrorMessage: '请输入分组名称！'
                }).then(({value}) => {
                    this.form.group = value
                }).catch(() => {
                })
            },
            addAppType () {
                this.$prompt('请输入项目类型', '提示', {
                    inputPattern: /.+/,
                    inputErrorMessage: '请输入类型！'
                }).then(({value}) => {
                    this.appInfo.group = value
                }).catch(() => {
                })
            },
            fetch_type_options(){
                this.$http.get('/api/deploy/apps/groups/').then(res => {
                    this.group_options = res.result;
                }, res => this.$layer_message(res.result))
            },
            fetch_images_options () {
                this.$http.get('/api/deploy/images/').then(res => {
                    this.app_images_options = res.result.map(x => Object({label: x.name, value: x.id, children: []}));
                }, res => this.$layer_message(res.result)).finally(() => this.tableLoading = false)
            },
            loadImageTag(val) {
                console.log('appInfo', val);
                this.$http.get(`/api/deploy/images/${val}/tags/`).then(res => {
                    for (let tag of this.app_images_options) {
                        if (tag.value == val) {
                            tag.children = res.result.map(x => Object({label: x.name, value: x.id}));
                        }
                    }
                }, res => this.$layer_message(res.result))
            },
            fetchEnvironments () {
                if (this.environments === undefined) {
                    this.$http.get('/api/configuration/environments/').then(res => {
                        this.environments = res.result
                    }, res => this.$layer_message(res.result))
                }
            },
            bindImageTag(val){
                this.appInfo['image_id'] = val[0];
                this.appInfo['image_tag_id'] = val[1];
            },
            addEnv () {
                this.envForm = { name: '', desc: '', value: {}};
                this.envVisible = true
            },
            envSave(){
                this.envVisible = false;
                if (this.envData.length !== 0 ) {
                    for (let e of this.envData ){
                        if (e.name == this.envForm.name){
                            e = this.envForm;
                            return;
                        }
                    }
                    this.envData.push(this.envForm);
                }else {
                    this.envData.push(this.envForm);
                }
            },
            delEnv(row){
                for (let x in this.envData){
                    if (this.envData[x].name == row.name){
                        this.envData.splice(x, 1)
                    }
                }
            },
            editEnv(row){
                this.envVisible = true;
                this.envForm = row;
                console.log('row', row);
            },
            menuEditOpen(row) {
                this.menuForm = row;
                this.menuDialogTitle = '菜单编辑 - ' + row['name'];
                this.menuVisible = true;
            },
            menuSave(){
                this.menuVisible = false;
                console.log(this.menuData);
            },
            handleDeploy() {
                this.dialogDeployVisible = true;
                this.$http.post('/api/deploy/publish/deploy', this.deployForm).then(res => {
                    this.updateHosts = this.deploy_host.map(item => {
                        const [id, instance_name] = item.split(',', 2);
                        return {id, instance_name, type: 'info', detail: []}
                    });
                    this.fetchDeployResult(res.result);
                }, res => this.$layer_message(res.result))
            },
            fetchDeployResult(token) {
                this.$http.get(`/api/common/queue/state/${token}`).then(res => {
                    console.log('result', res.result);
                    if (res.result['complete'] === true) return;
                    this.fetchDeployResult(token);
                    for (let [index, item] of Object.entries(this.updateHosts)) {
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
        },

        created () {
            this.fetch_type_options();
            // this.get_ecs_host();
            this.fetchEnvironments();
        }
    }
</script>