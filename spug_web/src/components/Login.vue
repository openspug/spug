<template>
    <div class="login">
        <el-row style="z-index: 1;height: 100%;">
            <el-card class="login-box"  element-loading-background="rgba(0, 0, 0, 0.8)">
                <el-form ref="form" :model="form" :rules="rules" label-with="80px" @keyup.enter.native="handleSubmit">
                    <h1 class="title">Spug运维平台</h1>
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
            </el-card>
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
    .login-box {
        background: rgba(0, 0, 0, 0.5);
        border: none;
        width: 25%;
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
    .login-box .title {
        color: #ffffff;
        text-align: center;
    }
</style>
<script>
    export default {
        data() {
            return {
                loading: false,
                error: '',
                form: {
                    username: '',
                    password: ''
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
                    this.$http.post('/api/account/users/login/', this.form).then(res => {
                        localStorage.setItem('token', res.result['token']);
                        localStorage.setItem('is_supper', res.result['is_supper']);
                        localStorage.setItem('permissions', res.result['permissions']);
                        localStorage.setItem('user_id', res.result['id']);
                        localStorage.setItem('nickname', res.result['nickname']);
                        this.$router.push('/welcome');
                    }, response => {
                        this.error = response.result
                    }).finally(() => this.loading = false)
                })
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