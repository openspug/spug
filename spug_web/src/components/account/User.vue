<template>
    <div>
        <el-row>
            <el-col :span="16">
                <el-form :inline="true" :model="filters">
                    <el-form-item>
                        <el-input v-model="filters.name" placeholder="姓名"></el-input>
                    </el-form-item>
                    <el-form-item>
                        <el-button type="primary" icon="search" @click="name_Search()">查询</el-button>
                    </el-form-item>
                </el-form>
            </el-col>
            <el-col :span="8" style="text-align: right">
                <el-button @click="refresh()">刷新</el-button>
                <el-button v-if="has_permission('account_user_add')" style="float: right" type="primary"
                           @click="handleAdd()">添加用户
                </el-button>
            </el-col>
        </el-row>

        <el-table :data="tableData.data" stripe border v-loading="listLoading" style="width: 100%">
            <el-table-column type="index" width="60"></el-table-column>
            <el-table-column prop="username" label="登录名" sortable></el-table-column>
            <el-table-column prop="nickname" label="姓名" sortable></el-table-column>
            <el-table-column prop="role_name" label="角色"></el-table-column>
            <el-table-column prop="type" label="类型"></el-table-column>
            <el-table-column prop="last_login" label="最近登录"></el-table-column>
            <el-table-column label="状态" sortable width="90">
                <template slot-scope="scope">
                    <el-tag type="success" v-if="scope.row.is_active">正常</el-tag>
                    <el-tag type="danger" v-else>禁用</el-tag>
                </template>
            </el-table-column>
            <el-table-column v-if="has_permission('account_user_edit|account_user_disable')" label="操作" width="250">
                <template slot-scope="scope">
                    <el-button v-if="has_permission('account_user_edit')" size="small" @click="handleEdit(scope.$index, scope.row)">编辑</el-button>
                    <el-button v-if="has_permission('account_user_disable') && scope.row.is_active" size="small"
                               type="danger" :loading="btnDelLoading[scope.row.id]" @click="handleDisable(scope.$index, scope.row)">禁用
                    </el-button>
                    <el-button  v-if="has_permission('account_user_disable') && scope.row.is_active != 1" size="small"
                                type="success" :loading="btnDelLoading[scope.row.id]" @click="handleDisable(scope.$index, scope.row)">启用
                    </el-button>
                    <el-button v-if="has_permission('account_user_disable')" size="small" type="warning" @click="RestPwd(scope.$index, scope.row)">重置密码
                    </el-button>
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


        <!--编辑新增界面-->
        <el-dialog :title="editFormTitle" visible v-if="dialogShow" @close="dialogShow = false" :close-on-click-modal="false">
            <el-form ref="editForm" :model="editForm" :rules="rules" label-width="80px">
                <el-form-item prop="username" label="登录名">
                    <el-input placeholder="请输入" v-model="editForm.username" auto-complete="off" :disabled="is_disabled"></el-input>
                </el-form-item>
                <el-form-item prop="nickname" label="姓名">
                    <el-input placeholder="请输入" v-model="editForm.nickname" auto-complete="off"></el-input>
                </el-form-item>
                <el-form-item prop="password" label="密码" :style="display" >
                    <el-input placeholder="请输入" type="password" v-model="editForm.password" auto-complete="off"></el-input>
                </el-form-item>
                <el-form-item prop="checkPass" label="确认密码" :style="display" width="180" >
                    <el-input placeholder="请输入" type="password" v-model="editForm.checkPass" auto-complete="off"></el-input>
                </el-form-item>
                <el-form-item label="角色" required>
                    <el-select v-model="editForm.role_id" placeholder="请选择用户角色">
                        <el-option v-for="role in roles" :key="role.id" :label="role.name" :value="role.id"></el-option>
                    </el-select>
                </el-form-item>
                <el-form-item prop="email" label="邮箱">
                    <el-input placeholder="请输入" v-model="editForm.email" auto-complete="off"></el-input>
                </el-form-item>
                <el-form-item prop="mobile" label="电话" required>
                    <el-input placeholder="请输入" v-model="editForm.mobile" auto-complete="off"></el-input>
                </el-form-item>
                <el-alert v-if="error" :title="error" type="error" style="margin-top: -10px; margin-bottom: 10px"
                          show-icon></el-alert>
            </el-form>
            <div slot="footer">
                <el-button type="text" @click.native="dialogShow = false">取消</el-button>
                <el-button type="primary" :loading="editLoading" @click.native="editSubmit">保存</el-button>
            </div>
        </el-dialog>
    </div>
</template>

<script>
    export default {
        data() {
            let validatePass = (rule, value, callback) => {
                if (value === '') {
                    callback(new Error('请输入密码'));
                } else {
                    if (this.editForm.checkPass !== '') {
                        this.$refs.editForm.validateField('checkPass');
                    }
                    callback();
                }
            };

            let validatePass2 = (rule, value, callback) => {
                if (value === '') {
                    callback(new Error('请再次输入密码'));
                } else if (value !== this.editForm.password) {
                    callback(new Error('两次输入密码不一致!'));
                } else {
                    callback();
                }
            };

            let checkMobile = (rule, value, callback) => {
                if (value === '') {
                    return callback(new Error('手机号不能为空'));
                }
                setTimeout(() => {
                    let mobile = /^1[34578]\d{9}$/;
                    if (!mobile.test(value)) {
                        callback(new Error('手机号不正确'));
                    } else {
                        callback();
                    }
                }, 1000);
            };

            return {
                filters: {
                    name: ''
                },
                error: '',
                dialogShow: false,
                tableData: {},
                roles: undefined,
                roles_map: {},
                display: '',
                listLoading: false,
                btnDelLoading: {},
                editFormTitle: '',
                editLoading: false,
                is_disabled: '',
                currentPage: 1,
                addForm: {
                    id: 0,
                    username: '',
                    nickname: '',
                    password: '',
                    checkPass: '',
                    role_id: '',
                    email: '',
                    mobile: '',
                },
                editForm: {},
                rules: {
                    username: [
                        {required: true, message: '请输入登录名', trigger: 'blur'}
                    ],
                    nickname: [
                        {required: true, message: '请输入姓名', trigger: 'blur'}
                    ],
                    mobile: [
                        {validator: checkMobile, trigger: 'blur'}
                    ],
                    email:[
                        { required: true, message: '请输入邮箱地址', trigger: 'blur' },
                        { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur,change' }
                    ],
                    password: [
                        {validator: validatePass, trigger: 'blur'}
                    ],
                    checkPass: [
                        {validator: validatePass2, trigger: 'blur'}
                    ],
                },
            }
        },
        methods: {
            handleCurrentChange(val) {
                this.currentPage = val;
                this.getUsers(this.currentPage);
            },

            //名字查询
            name_Search(){
                this.currentPage = 1;
                this.getUsers();
            },

            //刷新操作
            refresh(){
                this.getUsers(this.currentPage);
            },

            //获取用户列表
            getUsers(page, callback) {
                if (!page) page = 1;
                if (!callback) callback = this.updateRoleName;
                this.listLoading = true;
                this.$http.get('/api/account/users/', {
                    params: {
                        page: page,
                        name: this.filters.name
                    }
                }).then((response) => {
                    this.tableData = response.result;
                    if (callback) callback(this)
                }, (response) => this.$layer_message(response.result)).finally(() => this.listLoading = false)
            },

            // 更新角色名称
            updateRoleName(that) {
                for (let user of that.tableData.data) {
                    if (that.roles_map.hasOwnProperty(user.role_id)) {
                        that.$set(user, 'role_name', that.roles_map[user.role_id]['name'])
                    }
                }
            },

            //显示添加界面
            handleAdd: function () {
                this.is_disabled = false;
                this.dialogShow = true;
                this.editFormTitle = '添加用户';
                this.display = 'display:block';
                this.editForm = this.addForm;
            },

            //显示编辑界面
            handleEdit: function (index, row) {
                this.is_disabled = true;
                this.dialogShow = true;
                this.editFormTitle = '编辑用户';
                this.display = 'display:none';
                //this.editForm = Object.assign({}, row);
                this.editForm = this.$deepCopy(row);
            },

            //禁/启 用用户
            handleDisable: function (index, row) {
                if (row.is_active) {
                    var res = "禁用";
                } else {
                    var res = "启用";
                }
                this.$confirm('确认' + res + '吗?', '警告', {
                    type: 'warning'
                }).then(() => {
                    this.btnDelLoading = {[row.id]: true}
                    this.editForm = row;
                    this.editForm.is_active = ! row.is_active;
                    this.EditData(row, res + '成功', '');
                }).catch(() => {
                });
            },

            //重置密码
            RestPwd: function (index, row) {
                this.$confirm('确认重置吗?', '提示', {
                    type: 'warning'
                }).then(() => {
                    this.listLoading = true;
                    this.editForm = row;
                    this.editForm.password = 'Password';
                    this.EditData(row, '默认密码: ', 'Password');
                }).catch(() => {
                });
            },

            EditData: function (row, msg, pwd) {
                this.$http.put(`/api/account/users/${row.id}`, this.editForm).then(response => {
                    this.listLoading = false;
                    this.$layer_message(msg + pwd, 'success');
                    this.getUsers(this.currentPage);
                }, response => this.$layer_message(response.result)).finally(() => this.btnDelLoading = {});
            },

            editSubmit: function () {
                this.$refs.editForm.validate((valid) => {
                    if (valid) {
                        this.editLoading = true;
                        this.error = '';
                        if (this.editForm.id) {
                            this.$http.put(`/api/account/users/${this.editForm.id}`, this.editForm).then(this.resp,
                                response => this.$layer_message(response.result)).finally(() => this.editLoading = false)
                        } else {
                            this.$http.post('/api/account/users/', this.editForm).then(this.resp,
                                response => this.$layer_message(response.result)).finally(() => this.editLoading = false)
                        }
                    }
                });
            },
            resp: function (response) {
                this.editLoading = false;
                this.$layer_message('提交成功', 'success');
                this.editForm = {};
                this.addForm = {role_id: ''};
                this.dialogShow = false;
                this.getUsers(this.currentPage);
            }
        },
        mounted() {
            this.getUsers(1, function (that) {
                that.$http.get('/api/account/roles/').then(res => {
                    that.roles = res.result;
                    that.roles.forEach(item => that.roles_map[item.id] = item);
                    that.updateRoleName(that)
                }, res => that.$layer_message(res.result))
            });
        }
    }
</script>
