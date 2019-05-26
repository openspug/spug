<style scoped>
    @import '../assets/styles/common.css';
</style>
<template>
    <div class="layout-wrapper">
        <div class="layout-side" :class="{'layout-side-extend': !isCollapse}">
            <div class="layout-logo" v-if="!isCollapse">Spug运维平台</div>
            <div class="layout-logo" v-else>S</div>
            <el-menu :collapse="isCollapse" :default-active="current_index" @select="handleSelect" unique-opened router>
                <template v-for="item in menus" v-if="has_permission(item.permission)">
                    <el-submenu v-if="item.subs" :index="item.key">
                        <template slot="title">
                            <i :class="item.icon"></i>
                            <span slot="title">{{ item.desc }}</span>
                        </template>
                        <el-menu-item :index="sub.key" v-for="sub in item.subs" v-if="has_permission(sub.permission)" :key="sub.key">{{ sub.desc }}</el-menu-item>
                    </el-submenu>
                    <el-menu-item v-else :index="item.key">
                        <i :class="item.icon"></i>
                        <span slot="title">{{ item.desc }}</span>
                    </el-menu-item>
                </template>
            </el-menu>
        </div>
        <div class="layout-main">
            <div class="layout-header">
                <div class="i-button">
                    <i class="fa fa-sign-out" @click="logout"></i>
                </div>
                <div class="i-button">
                    <el-dropdown trigger="click" @command="handleCommand">
                        <span class="el-dropdown-link "> <i class="fa fa-user"></i> {{ login_user }}<i class="el-icon-arrow-down el-icon--right"></i></span>
                        <el-dropdown-menu slot="dropdown">
                            <el-dropdown-item command="person">个人信息</el-dropdown-item>
                            <el-dropdown-item command="set_person">设置</el-dropdown-item>
                        </el-dropdown-menu>
                    </el-dropdown>
                </div>
                <div class="i-button">
                    <i class="fa fa-envelope"></i>
                </div>
                <div style="flex-grow: 1"></div>
                <div class="i-button">
                    <i class="fa fa-bars" @click="isCollapse = !isCollapse"></i>
                </div>
            </div>
            <div class="layout-body">
                <router-view @routerChange="routerChange"></router-view>
            </div>
            <div class="layout-footer">
                Create By Openspug@<a style="color: #99a9bf" href="https://github.com/openspug">Github</a>
            </div>
        </div>
    </div>
</template>
<script>
    import menu from '../config/menu';
    export default {
        data() {
            return {
                current_index: undefined,
                isCollapse: false,
                menus: menu.menus,
                login_user: undefined,
            }
        },
        methods: {
            logout() {
                this.$http.get('/api/account/users/logout/').finally(() => {
                    localStorage.removeItem('token');
                    this.$router.push({name: 'login'})
                })
            },
            handleCommand(command) {
                if (command === 'person') {
                    this.$router.push({path: '/account/person'})
                }
                if (command === 'set_person'){
                    this.$router.push({path: '/account/personset'})
                }
            },
            routerChange() {
                this.current_index = this.$route.path;
            },
            handleSelect(path) {
                this.current_index = path
            },
            back_login(){
                let token = localStorage.getItem('token');
                if (!token || token.length !== 32) {
                    this.$router.push({name: 'login'})
                }
            },
            personInfo(){
                this.login_user = localStorage.getItem('nickname');
            }
        },
        created() {
            this.back_login();
            this.personInfo();

        }
    }
</script>

