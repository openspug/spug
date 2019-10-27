<template>
    <div class="login">
        <el-row style="z-index: 1;height: 100%;">
            <div class="box-container">
                <span class="title">Spug运维平台</span>
                <el-card class="login-box"  >
                    <el-tabs v-model="activeName" @tab-click="handleClick">
                        <el-tab-pane label="标准登录" name="standard">
                            <el-form ref="form" :model="form" :rules="rules" label-with="80px" @keyup.enter.native="handleSubmit">
                                <!--<p class="login-box-msg">运维平台</p>-->
                                <el-form-item prop="username">
                                    <el-input v-model="form.username" :autofocus="true" placeholder="请输入用户">
                                        <template slot="prepend">
                                            <i class="fa fa-user"></i>
                                        </template>
                                    </el-input>
                                </el-form-item>
                                <el-form-item prop="password">
                                    <el-input type="password" v-model="form.password" placeholder="请输入密码" >
                                        <template slot="prepend">
                                            <i class="fa fa-lock"></i>
                                        </template>
                                    </el-input>
                                </el-form-item>
                                <el-form-item>
                                    <el-alert v-if="error" :title="error" type="error" style="margin-top: -10px; margin-bottom: 10px" show-icon></el-alert>
                                    <el-button type="primary" :loading="loading" @click="handleSubmit" style="width: 100%">登录</el-button>
                                </el-form-item>
                            </el-form>
                        </el-tab-pane>
                        <el-tab-pane label="LDAP登录" name="ldap">
                            <el-form ref="form" :model="form" :rules="rules" label-with="80px" @keyup.enter.native="handleSubmit">
                                <!--<p class="login-box-msg">运维平台</p>-->
                                <el-form-item prop="username">
                                    <el-input v-model="form.username" :autofocus="true" placeholder="请输入LDAP用户">
                                        <template slot="prepend">
                                            <i class="fa fa-user"></i>
                                        </template>
                                    </el-input>
                                </el-form-item>
                                <el-form-item prop="password">
                                    <el-input type="password" v-model="form.password" placeholder="请输入LDAP密码" >
                                        <template slot="prepend">
                                            <i class="fa fa-lock"></i>
                                        </template>
                                    </el-input>
                                </el-form-item>
                                <el-form-item>
                                    <el-alert v-if="error" :title="error" type="error" style="margin-top: -10px; margin-bottom: 10px" show-icon></el-alert>
                                    <el-button type="primary" :loading="loading" @click="handleSubmit" style="width: 100%">登录</el-button>
                                </el-form-item>
                            </el-form>
                        </el-tab-pane>
                    </el-tabs>
                </el-card>
            </div>
        </el-row>

    </div>
</template>
<style>
    .login {
        background: url(../assets/login.jpg) no-repeat scroll center center / cover;
        background-size: 100% 100%;
        width: 100%;
        height: 100%;
        position: fixed;
    }
    .title {
        width: 100%;
        font-size: 50px;
        color: #ffffff;
        text-align: center;
        display: inline-block;
        margin-bottom: 20px;
    }
    .box-container {
        border: none;
        width: 30%;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate3d(-50%, -50%,0);
        -webkit-transform: translate3d(-50%, -50%,0);
    }
    .login-box-msg {
        color: #ffffff;
        text-align: center;
    }

</style>
<script>
    export default {
        data() {
            return {
                activeName: 'standard',
                loading: false,
                selectTab: 'standard',
                error: '',
                form: {
                    username: 'admin',
                    password: 'spug'
                },
                rules: {
                    username: [
                        {required: true, message: '请输入用户', trigger: 'blur'}
                    ],
                    password: [
                        {required: true, message: '请输入密码', trigger: 'blur'}
                    ]
                }
            }
        },
        methods: {
            handleSubmit() {
                this.error = '';
                this.$refs['form'].validate(pass => {
                    if (!pass) {
                        return false
                    }
                    this.loading = true;
                    this.form.type = this.selectTab;
                    console.log('this.form', this.form);
                    this.$http.post('/api/account/users/login/', this.form).then(res => {
                        localStorage.setItem('token', res.result['token']);
                        localStorage.setItem('is_supper', res.result['is_supper']);
                        localStorage.setItem('permissions', res.result['permissions']);
                        localStorage.setItem('nickname', res.result['nickname']);
                        this.$router.push('/welcome');
                    }, response => {
                        this.error = response.result
                    }).finally(() => this.loading = false)
                })
            },
            handleClick(tab, event) {
                this.selectTab = tab.name;
            }
        },
        watch: {
            form: {
                handler: function () {
                    this.error = ''
                },
                deep: true
            }
        }
    }
</script>
