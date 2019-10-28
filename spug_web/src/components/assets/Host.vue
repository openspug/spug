<template>
    <div>
        <el-row>
            <el-col :span="16">
                <el-form :inline="true" :model="host_query">
                    <el-form-item>
                        <el-input v-model="host_query.name_field" clearable placeholder="主机名称"></el-input>
                    </el-form-item>
                    <el-select v-model="host_query.zone_field" @change="zone_Search()" clearable placeholder="区域">
                        <el-option v-for="item in zone_options" :key="item" :value="item"></el-option>
                    </el-select>
                    <el-form-item>
                        <el-button type="primary" icon="search" @click="fetch()">查询</el-button>
                    </el-form-item>
                </el-form>
            </el-col>
            <el-col :span="8"  style="text-align: right">
                <el-button @click="refresh()">刷新</el-button>
                <el-button v-if="has_permission('assets_host_add')" type="primary" @click="handleAdd">添加主机</el-button>
            </el-col>
        </el-row>
        <el-table :data="hosts.data" @expand-change="get_host_extend" v-loading="tableLoading" style="width: 100%; margin-top: 20px">
            <el-table-column type="expand">
                <template slot-scope="props">
                    <el-form v-if="props.row.extend" label-position="left" inline class="demo-table-expand">
                        <el-form-item label="操作系统"><span>{{ props.row.extend.operate_system }}</span></el-form-item>
                        <el-form-item label="内存"><span>{{ props.row.extend.memory }} G</span></el-form-item>
                        <el-form-item label="CPU"><span>{{ props.row.extend.cpu }} 核</span></el-form-item>
                        <el-form-item label="硬盘"><span>{{ props.row.extend.disk }} G</span></el-form-item>
                        <el-form-item label="外网IP"><span>{{ props.row.extend.outer_ip }}</span></el-form-item>
                        <el-form-item label="内网IP"><span>{{ props.row.extend.inner_ip }}</span></el-form-item>
                        <el-form-item label="SSh端口"><span>{{ props.row.ssh_port }}</span></el-form-item>
                        <el-form-item label="备注信息"><span>{{ props.row.desc }}</span></el-form-item>
                    </el-form>
                    <el-row v-else style="text-align: center">
                        <span style="color: #99a9bf">暂没有配置信息，点击验证自动获取，需要配置docker连接地址</span>
                    </el-row>
                </template>
            </el-table-column>

            <el-table-column prop="name" label="主机名称"></el-table-column>
            <el-table-column prop="zone" label="所属区域"></el-table-column>
            <el-table-column prop="type" label="类型"></el-table-column>
            <el-table-column label="SSH连接">
                <template slot-scope="scope">
                    {{scope.row['ssh_ip']}}:{{scope.row['ssh_port']}}
                </template>
            </el-table-column>
            <el-table-column prop="desc" label="备注"></el-table-column>
            <el-table-column label="操作" width="240px" v-if="has_permission('assets_host_edit|assets_host_del|assets_host_valid')">
                <template slot-scope="scope">
                    <el-button v-if="has_permission('assets_host_edit')" size="small" @click="handleEdit(scope.row)">编辑</el-button>
                    <el-button v-if="has_permission('assets_host_valid')" size="small" type="primary" @click="valid(scope.row)"
                               :loading="btnValidLoading[scope.row.id]">验证
                    </el-button>
                    <el-button v-if="has_permission('assets_host_del')" size="small" type="danger" @click="deleteCommit(scope.row)"
                               :loading="btnDelLoading[scope.row.id]">删除
                    </el-button>
                </template>
            </el-table-column>
        </el-table>

        <!--分页-->
        <div class="pagination-bar" v-if="hosts.total > 10">
            <el-pagination
                    @current-change="handleCurrentChange"
                    :current-page="currentPage"  layout="total, prev, pager, next"
                    :total="hosts.total">
            </el-pagination>
        </div>

        <el-dialog visible :title="title" v-if="dialogVisible" width="80%" :close-on-click-modal="false">
            <el-tabs v-model="activeName" >
                <el-tab-pane label="单条记录" name="first">
                    <el-form :model="form" label-width="80px">
                        <el-form-item label="所属区域" prop="zone" required>
                            <el-select v-model="form.zone" placeholder="所在区域">
                                <el-option v-for="z in zone_options" :value="z" :key="z"></el-option>
                            </el-select>
                            <el-button style="margin-left: 15px" type="text" @click="addZone">添加区域</el-button>
                        </el-form-item>
                        <el-form-item label="主机类型" prop="type" required>
                            <el-input v-model="form.type" placeholder="主机的类型，例如：web-server"></el-input>
                        </el-form-item>
                        <el-form-item label="主机名称" prop="name" required>
                            <el-input v-model="form.name" placeholder="主机唯一标识，例如：web-01"></el-input>
                        </el-form-item>
                        <el-form-item label="Docker连接地址" prop="docker_uri">
                            <el-input v-model="form.docker_uri" placeholder="用于应用发布等与容器相关功能，例如：192.168.1.1:2375"></el-input>
                        </el-form-item>
                        <el-form-item label="SSH地址" prop="ssh_ip" required>
                            <el-input v-model="form.ssh_ip" placeholder="连接主机的SSH地址，例如：192.168.1.1"></el-input>
                        </el-form-item>
                        <el-form-item label="SSH端口" prop="ssh_ip" required>
                            <el-input v-model="form.ssh_port" placeholder="主机的SSH端口，例如：22"></el-input>
                        </el-form-item>
                        <el-form-item label="备注信息" prop="outer_ip">
                            <el-input v-model="form.desc" type="textarea" autosize placeholder="额外备注信息"></el-input>
                        </el-form-item>
                    </el-form>
                </el-tab-pane>

                <el-tab-pane label="批量导入" name="second" v-if="importStatus" v-loading="import_loading" element-loading-text="正在导入...">
                    <a :href= "download_url" download="host.xls">批量导入模板下载.xls</a>
                    <div class="el-upload__tip"></div>
                    <el-upload ref="upload" action="" :http-request="import_submit" name="file" :multiple="false"
                               :before-upload="beforeAvatarUpload" :file-list="fileList">
                        <el-button size="small" type="primary" v-if="has_permission('assets_host_add')">点击批量导入</el-button>
                        <div slot="tip" class="el-upload__tip">只能上传xls/xlsx文件</div>
                    </el-upload>
                </el-tab-pane>
            </el-tabs>

            <div slot="footer">
                <el-button @click="dialogVisible=false">取消</el-button>
                <el-button type="primary" @click="saveCommit" :loading="btnSaveLoading">保存</el-button>
            </div>
        </el-dialog>
    </div>
</template>


<style>
    .demo-table-expand {
        font-size: 0;
    }
    .demo-table-expand label {
        width: 90px;
        color: #99a9bf;
    }
    .demo-table-expand .el-form-item {
        margin-right: 0;
        margin-bottom: 0;
        width: 50%;
    }
</style>

<script>
    export default {
        data () {
            return {
                host_zone: '',
                host_query: {
                    name_field: '',
                    zone_field: '',
                },
                dialogVisible: false,
                btnSaveLoading: false,
                btnDelLoading: {},
                btnValidLoading: {},
                tableLoading: true,
                form: { zone: '' },
                hosts: [],
                currentPage: 1,
                zone_options: [],
                file_name: 'file',
                title: '编辑主机',
                activeName:'first',
                importStatus: false,
                fileList: [],
                tp_file:'',
                import_loading: false,
                download_url: "/api/apis/files/download/host.xls",
            }
        },
        methods: {
            handleCurrentChange(val) {
                this.currentPage = val;
                this.fetch(this.currentPage);
            },

            //区域查询
            zone_Search(){
                this.currentPage = 1;
                this.fetch();
            },

            //刷新
            refresh(){
                this.fetch(this.currentPage);
            },

            //获取区域
            get_host_zone () {
                this.$http.get('/api/assets/hosts/zone/').then(res => {
                    this.zone_options = res.result
                }, res => this.$layer_message(res.result))
            },

            fetch (page) {
                if (!page) page = 1;
                this.tableLoading = true;
                let api_uri = '/api/assets/hosts/';
                this.$http.get(api_uri, {params: {page: page, host_query: this.host_query}}).then(res => {
                    this.hosts = res.result
                }, res => this.$layer_message(res.result)).finally(() => this.tableLoading = false)
            },

            get_host_extend (row, expanded) {
                if (expanded) {
                    this.$http.get(`/api/assets/hosts/${row.id}/extend/`).then(res => {
                        this.$set(row, 'extend', res.result)
                    }, res => this.$layer_message(res.result))
                }
            },
            beforeAvatarUpload: function (file) {
                if (['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].indexOf(file.type) == -1) {
                    this.$layer_message('请上传xls, xlsx格式的文件');
                    return false
                }
            },

            import_submit(data){
                this.import_loading = true;
                var excel_file = new FormData();
                excel_file.append('file', data.file);
                this.$http.post(`/api/assets/hosts/import`, excel_file).then(res => {
                    this.import_loading=false;
                    this.dialogVisible = false;
                    this.$refs.upload.clearFiles();
                    this.$layer_message(res.result, 'success');
                }, res => this.$layer_message(res.result));
            },
            addOpen () {
                this.form = {zone: ''};
                this.title = '添加主机';
                this.dialogVisible = true;
            },

            handleAdd () {
                this.form = {zone: ''};
                this.title = '添加主机';
                this.dialogVisible = true;
                this.importStatus = true;
            },

            handleEdit (row) {
                this.form = this.$deepCopy(row);
                this.dialogVisible = true;
                this.title = '编辑主机';
                this.importStatus = false;
            },
            saveCommit () {
                this.btnSaveLoading = true;
                let request;
                if (this.form.id) {
                    request = this.$http.put(`/api/assets/hosts/${this.form.id}`, this.form)
                } else {
                    request = this.$http.post(`/api/assets/hosts/`, this.form)
                }
                request.then(() => {
                    this.dialogVisible = false;
                    this.$layer_message('提交成功', 'success');
                    this.fetch(this.currentPage);
                    this.get_host_zone()
                }, res => this.$layer_message(res.result)).finally(() => this.btnSaveLoading = false)
            },
            deleteCommit (row) {
                this.$confirm('此操作将永久删除该主机，是否继续？', '删除确认', {type: 'warning'}).then(() => {
                    this.btnDelLoading = {[row.id]: true};
                    this.$http.delete(`/api/assets/hosts/${row.id}`).then(() => {
                        this.fetch(this.currentPage)
                    }, res => this.$layer_message(res.result)).finally(() => this.btnDelLoading = {})
                }).catch(() => {
                })
            },
            valid (row) {
                this.btnValidLoading = {[row.id]: true};
                this.$http.get(`/api/assets/hosts/${row.id}/valid`).then(() => {
                    this.$layer_message('验证通过', 'success');
                    this.btnValidLoading = {}
                }, res => {
                    if (res.result === 'ssh fail') {
                        this.$prompt('请输入root用户密码', {
                            inputType: 'password',
                            inputPattern: /.+/,
                            inputErrorMessage: '请输入',
                            closeOnClickModal: false
                        }).then(({value}) => {
                            this.$http.post(`/api/assets/hosts/${row.id}/valid`, {secret: value}).then(() => {
                                this.$layer_message('验证通过', 'success')
                            }, res => this.$layer_message(res.result)).finally(() => this.btnValidLoading = {})
                        }).catch(() => {
                            this.$layer_message('取消验证', 'warning');
                            this.btnValidLoading = {}
                        })
                    } else if (res.result === 'docker fail') {
                        this.btnValidLoading = {};
                        this.$layer_message('获取扩展信息失败，请检查docker是否可以正常连接', 'warning')
                    } else {
                        this.btnValidLoading = {};
                        this.$layer_message(res.result);
                    }

                })
            },
            addZone () {
                this.$prompt('请输入主机区域', '提示', {
                    inputPattern: /.+/,
                    inputErrorMessage: '请输入区域！'
                }).then(({value}) => {
                    this.form.zone = value
                }).catch(() => {
                })
            },

        },
        created () {
            this.fetch();
            this.get_host_zone()
        }
    }
</script>