<template>
    <div>
        <el-row>
            <el-col :span="16">
                <el-form :inline="true" :model="notify_query">
                    <el-form-item>
                        <el-input clearable v-model="notify_query.name_field" placeholder="通知名称"></el-input>
                    </el-form-item>
                    <el-form-item>
                        <el-button type="primary" icon="search" @click="nameSearch()">查询</el-button>
                    </el-form-item>
                </el-form>
            </el-col>
            <el-col :span="8" style="text-align: right">
                <el-button @click="refresh()">刷新</el-button>
                <el-button v-if="has_permission('system_notify_add')" style="float: right" type="primary"
                           @click="handleAdd()">添加通知
                </el-button>
            </el-col>
        </el-row>

        <el-table :data="tableData.data" stripe border v-loading="listLoading" style="width: 100%"
                  :default-sort="{prop: 'username', order: 'descending'}">
            <el-table-column type="index" width="60"></el-table-column>
            <el-table-column prop="name" label="通知名称" sortable></el-table-column>
            <el-table-column prop="value" label="通知URL"  sortable></el-table-column>
            <el-table-column prop="desc" label="备注"></el-table-column>
            <el-table-column v-if="has_permission('system_notify_view|system_notify_add|system_notify_edit')" label="操作">
                <template slot-scope="scope">
                    <el-button v-if="has_permission('system_notify_edit')" size="small" @click="handleEdit(scope.$index, scope.row)">编辑</el-button>
                    <el-button v-if="has_permission('system_notify_add')" type="primary" size="small"
                               @click="handleDingTest(scope.row)">测试</el-button>
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
        <el-dialog :title="editFormTitle" :visible.sync="dialogShow" :close-on-click-modal="false">
            <el-form ref="editForm" :model="editForm" :rules="rules" label-width="80px">
                <el-form-item prop="name" label="通知名称">
                    <el-input v-model="editForm.name" ></el-input>
                </el-form-item>
                <el-form-item prop="value" label="通知URL" >
                    <el-input
                            placeholder="钉钉机器人完整URL，例如：https://oapi.dingtalk.com/robot/send?access_token=858124219d02d5bf412aab28a0b26"
                            type="textarea" :rows="3" v-model="editForm.value" auto-complete="off"></el-input>
                </el-form-item>

                <el-form-item prop="desc" label="备注信息">
                    <el-input v-model="editForm.desc" auto-complete="off"></el-input>
                </el-form-item>
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
            return {
                notify_query: {
                    name_field: ''
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
                    name: '',
                    value: '',
                    desc: '',
                },
                editForm: {},
                rules: {
                    name: [
                        {required: true, message: '请输入通知名称', trigger: 'blur'}
                    ],
                    value: [
                        {required: true, message: '请输入通知URL', trigger: 'blur'}
                    ],
                },
            }
        },
        methods: {
            handleCurrentChange(val) {
                this.currentPage = val;
                this.getNotify(this.currentPage);
            },

            //名称查询
            nameSearch(){
                this.currentPage = 1;
                this.getNotify();
            },

            //刷新操作
            refresh(){
                this.getNotify(this.currentPage);
            },

            //获取通知列表
            getNotify(page, callback) {
                if (!page) page = 1;
                this.listLoading = true;
                this.$http.get('/api/system/notify/', {
                    params: {notify_query: this.notify_query}
                }).then((response) => {
                    this.tableData = response.result;
                    if (callback) callback(this)
                }, (response) => this.$layer_message(response.result)).finally(() => this.listLoading = false)
            },

            //显示添加界面
            handleAdd: function () {
                this.is_disabled = false;
                this.dialogShow = true;
                this.editFormTitle = '添加通知';
                this.display = 'display:block';
                this.editForm = this.addForm;
            },

            //显示编辑界面
            handleEdit: function (index, row) {
                this.is_disabled = true;
                this.dialogShow = true;
                this.editFormTitle = '编辑通知';
                this.display = 'display:none';
                //this.editForm = Object.assign({}, row);
                this.editForm = this.$deepCopy(row);
            },

            EditData: function (row, msg, pwd) {
                this.$http.put(`/api/account/users/${row.id}`, this.editForm).then(response => {
                    this.listLoading = false;
                    this.$layer_message(msg + pwd, 'success');
                    this.getUsers(this.currentPage);
                }, response => this.$layer_message(response.result)).finally(() => this.btnDelLoading = {});
            },
            handleDingTest: function (row){
                this.$http.post(`/api/system/notify/test/${row.id}`, row).then( res=> {
                    this.$layer_message('测试成功', 'success');
                    this.getNotify(this.currentPage);
                })
            },

            editSubmit: function () {
                this.$refs.editForm.validate((valid) => {
                    if (valid) {
                        this.editLoading = true;
                        this.error = '';
                        if (this.editForm.id) {
                            this.$http.put(`/api/system/notify/${this.editForm.id}`, this.editForm).then(this.resp,
                                response => this.$layer_message(response.result)).finally(() => this.editLoading = false)
                        } else {
                            this.$http.post('/api/system/notify/', this.editForm).then(this.resp,
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
                this.getNotify(this.currentPage);
            }
        },
        mounted() {
            this.getNotify();
        }
    }
</script>
