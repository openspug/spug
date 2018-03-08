<template>
    <div class="info_container">
        <el-row class="info_row row" :gutter="10">
            <el-col :span="8">
                <div class="area">
                    <p class="title-container"><h5>个人信息</h5></p>
                    <el-form class="form"  :model="personInfo"  ref="personInfo" label-width="80px">
                        <el-form-item label="登录名">
                            <div class="info-msg">{{personInfo.username}}</div>
                        </el-form-item>
                        <el-form-item label="姓名" prop="nickname">
                            <div class="info-msg">{{personInfo.nickname}}</div>
                        </el-form-item>
                        <el-form-item label="邮箱" prop="email">
                            <div class="info-msg">{{personInfo.email}}</div>
                        </el-form-item>
                        <el-form-item label="电话" prop="mobile">
                            <div class="info-msg">{{personInfo.mobile}}</div>
                        </el-form-item>
                    </el-form>
                </div>
            </el-col>
        </el-row>
    </div>
</template>

<script>
    export default {
        data() {
            return {
                personInfo: {
                    username: '',
                    nickname: '',
                    email:'',
                    mobile: '',

                },
            }
        },
        methods: {
            //获取用户信息
            getPersonInfo(user_id) {
                this.$http.get(`/api/account/users/self`).then((response) => {
                    this.personInfo = response.result;
                }, (response) => this.$layer_message(response.result))
            },
            getPerson(){
                let user_id = localStorage.getItem('user_id');
                this.getPersonInfo(user_id);
            }
        },
        mounted() {
            this.getPerson();
        }
    }
</script>

<style >
.info-msg{
    padding: 0 10px;
}
</style>