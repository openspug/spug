<template>
    <div class="info_container">
        <el-row class="info_row row" :gutter="10">
            <el-tabs v-model="activeName" type="card">
                <el-tab-pane label="个人信息" name="person_setup">
                    <el-col :span="8">
                        <div class="area">
                            <p class="title"><h5>个人信息</h5></p>
                            <el-form class="form"  :model="personInfo" :rules="personRules" ref="personInfo" label-width="80px">
                                <el-form-item label="登录名">
                                    <el-input v-model="personInfo.username"  size="small" disabled></el-input>
                                </el-form-item>
                                <el-form-item label="姓名" prop="nickname">
                                    <el-input v-model="personInfo.nickname"  size="small" placeholder="请输入姓名"></el-input>
                                </el-form-item>
                                <el-form-item label="邮箱" prop="email">
                                    <el-input v-model="personInfo.email" size="small" placeholder="请输入邮箱"></el-input>
                                </el-form-item>
                                <el-form-item label="电话" prop="mobile">
                                    <el-input v-model="personInfo.mobile" size="small" placeholder="请输入电话"></el-input>
                                </el-form-item>
                                <el-form-item>
                                    <el-button type="primary" @click="modifyPerson('personInfo')">提交</el-button>
                                    <el-button @click="cancelPerson()">取消</el-button>
                                </el-form-item>
                            </el-form>
                        </div>
                    </el-col>
                </el-tab-pane>
                <el-tab-pane label="密码" name="pwd_setup">
                    <el-col :span="8">
                        <div class="area">
                            <p class="title"><h5>修改密码</h5></p>
                            <el-form class="form"  :model="pwdInfo"  :rules="pwdRules" ref="pwdInfo" label-width="80px">
                                <el-form-item label="原密码" prop="password">
                                    <el-input type="password" v-model="pwdInfo.password"  size="small"  placeholder="原密码"></el-input>
                                </el-form-item>
                                <el-form-item label="新密码" prop="newpassword">
                                    <el-input type="password" v-model="pwdInfo.newpassword" size="small" placeholder="新密码"></el-input>
                                </el-form-item>
                                <el-form-item label="确认密码" prop="surepassword">
                                    <el-input type="password" v-model="pwdInfo.surepassword" size="small" placeholder="确认新密码"></el-input>
                                </el-form-item>
                                <el-form-item>
                                    <el-button type="primary" @click="modifyPwd('pwdInfo')">提交</el-button>
                                    <el-button @click="resetPwd('pwdInfo')">重置</el-button>
                                </el-form-item>
                            </el-form>
                        </div>
                    </el-col>
                </el-tab-pane>
            </el-tabs>
        </el-row>
    </div>
</template>

<script>
    export default {
        data() {
            let validatePass = (rule, value, callback) => {
                if (value === '') {
                    callback(new Error('请输入新密码'));
                } else {
                    if (this.pwdInfo.surepassword !== '') {
                        this.$refs.pwdInfo.validateField('surepassword');
                    }
                    callback();
                }
            };

            let validateSurepwd = (rule, value, callback) => {
                if (value === '') {
                    callback(new Error('请输入确认密码'));
                } else if (value !== this.pwdInfo.newpassword) {
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
                personInfo: {
                    username: '',
                    nickname: '',
                    email:'',
                    mobile: '',

                },
                pwdInfo:{
                    password:'',
                    newpassword:'',
                    surepassword:''
                },
                activeName: 'person_setup',
                personRules: {
                    nickname: [
                        {required: true, message: '请输入姓名', trigger: 'blur'}
                    ],
                    mobile: [
                        {required: true, validator: checkMobile, trigger: 'blur'}
                    ],
                    email:[
                        { required: true, message: '请输入邮箱地址', trigger: 'blur' },
                        { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur,change' }
                    ],
                },
                pwdRules: {
                    password: [
                        { required: true, message: '请输入原密码', trigger: 'blur' }
                    ],
                    newpassword: [
                        {required: true, validator: validatePass, trigger: 'blur'}
                    ],
                    surepassword:[
                        { required: true, validator:validateSurepwd, trigger: 'blur' },
                    ],
                },
            }
        },
        methods: {
            //获取用户信息
            getPersonInfo() {
                this.$http.get(`/api/account/users/self`).then((response) => {
                    this.personInfo = response.result;
                }, (response) => this.$layer_message(response.result))
            },
            //重置密码表单
            cancelPerson: function () {
                this.$router.push('/welcome');
            },
            resetPwd: function () {
                this.pwdInfo = {};
            },

            modifyPwd: function () {
                if (this.pwdInfo.newpassword !== this.pwdInfo.surepassword) {
                    this.$layer_message('两次输入密码不一致');
                    return
                }
                this.$http.post(`/api/account/users/setting/password`, this.pwdInfo).then(() => {
                    this.$layer_message('修改成功', 'success');
                    this.logout();
                }, response => this.$layer_message(response.result));
            },
            modifyPerson: function () {
                this.$http.post(`/api/account/users/setting/info`, this.personInfo).then(() => {
                    this.$layer_message('保存成功', 'success');
                    localStorage.setItem('nickname', this.personInfo['nickname']);
                }, response => this.$layer_message(response.result));
            },
            logout() {
              this.$http.get('/api/account/users/logout/').finally(() => {
                localStorage.removeItem('token');
                this.$router.push({name: 'login'})
              })
            }
        },
        mounted() {
            this.getPersonInfo();
        }
    }
</script>