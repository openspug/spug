<template>
    <div>
        <el-dialog title="实时输出（10分钟超时）" :visible.sync="dialogMsgVisible" width="80%" :close-on-click-modal="false" @close="do_close">
            <pre ref="dialog_output" v-text="dialogMsgContent" :style="{'white-space': 'pre', 'overflow': 'auto', 'height': pre_height}"></pre>
            <div slot="footer">
                <el-button v-if="outputPause" @click="outputPause = false" type="success">恢复</el-button>
                <el-button v-else @click="outputPause = true" type="warning">暂停</el-button>
                <el-button type="primary" @click="dialogMsgVisible = false">关闭</el-button>
            </div>
        </el-dialog>
        <el-dialog title="执行结果（30秒超时）" :visible.sync="dialogRstVisible" @close="$emit('close')">
            <el-table :data="tableData" v-loading="tableLoading" style="width: 100%">
                <el-table-column prop="name" width="180px"></el-table-column>
                <el-table-column width="100px">
                    <template slot-scope="scope">
                        <el-tag v-if="scope.row.exec_code === undefined" type="info">执行中</el-tag>
                        <el-tag v-else-if="scope.row.exec_code === 0" type="success">成功</el-tag>
                        <el-tag type="danger" v-else>失败</el-tag>
                    </template>
                </el-table-column>
                <el-table-column>
                    <template slot-scope="scope">
                        <i v-if="scope.row.exec_code === undefined" class="el-icon-loading"></i>
                        <span v-else>退出状态码：{{scope.row.exec_code}}</span>
                    </template>
                </el-table-column>
            </el-table>
        </el-dialog>
    </div>
</template>

<script>
    export default {
        props: ['data', 'menu'],
        data() {
            return {
                dialogMsgVisible: false,
                dialogRstVisible: false,
                dialogMsgContent: '',
                dialogRstContent: {},
                outputPause: false,
                postForm: {},
                execToken: '',
                tableData: [],
                tableLoading: false
            }
        },
        computed: {
            pre_height() {
                return document.body.clientHeight - 400 + 'px'
            }
        },
        methods: {
            timeCounter(loadingInstance, timeout) {
                setTimeout(() => {
                    if (loadingInstance.visible) {
                        timeout -= 1;
                        loadingInstance.text = `等待${timeout}秒`;
                        this.timeCounter(loadingInstance, timeout)
                    }
                }, 1000);
            },
            do_close() {
                this.$emit('close');
                this.$http.delete(`/api/deploy/exec/${this.execToken}`).then(() => {
                }, res => this.$layer_message(res.result))
            },
            fetchStreamExecResult(token) {
                this.$http.get(`/api/common/queue/state/${token}`).then(res => {
                    if (res.result['complete'] === true) {
                        this.dialogMsgContent += '\n** 执行结束 **';
                        return
                    }
                    this.fetchStreamExecResult(token);
                    if (this.outputPause) return;
                    if (res.result.hasOwnProperty('message')) this.dialogMsgContent += res.result['message'];
                }, res => this.$layer_message(res.result))
            },
            fetchExecResult(token) {
                this.$http.get(`/api/common/queue/state/${token}`).then(res => {
                    if (res.result['complete'] === true) return;
                    this.fetchExecResult(token);
                    delete res.result.complete;
                    for (let item of this.tableData) {
                        if (Object.keys(res.result).includes(item.name)) {
                            this.$set(item, 'exec_code', res.result[item.name]);
                            break
                        }
                    }
                })
            },
            do_one_exec() {
                let timeout = 30;
                let loadingInstance = this.$loading({body: true, text: `等待${timeout}秒`});
                this.timeCounter(loadingInstance, timeout);
                this.$http.post('/api/deploy/exec/', this.postForm).then(res => {
                    this.$notify({
                        type: (res.result === 0) ? 'success' : 'error',
                        title: (res.result === 0) ? '成功' : '失败',
                        message: `返回状态码： ${res.result}`,
                        duration: (res.result === 0) ? 4500 : 0
                    });
                }, res => this.$layer_message(res.result)).finally(() => {
                    this.$emit('close');
                    loadingInstance.close()
                });
            },
            do_exec(value) {
                this.dialogMsgContent = '** 开始执行 **\n\n';
                if (value) this.postForm['message'] = value;
                if (this.menu.position === 2) {     //更多区
                    if (this.menu.display_type === 1) {     //实时输出
                        this.dialogMsgVisible = true;
                        this.$http.post('/api/deploy/exec/', this.postForm).then(res => {
                            this.execToken = res.result;
                            this.fetchStreamExecResult(this.execToken)
                        })
                    } else if (this.menu.display_type === 2) {   //返回执行结果
                        this.do_one_exec()
                    }
                } else if (this.menu.position === 1) {      //发布区
                    this.dialogRstVisible = true;
                    this.dialogRstVisible = true;
                    this.tableLoading = true;
                    this.$http.post('/api/deploy/exec/', this.postForm).then(res => {
                        this.tableData = res.result['data'];
                        this.fetchExecResult(res.result['token'])
                    }, res => this.$layer_message(res.result)).finally(() => this.tableLoading = false)
                }
            }
        },
        watch: {
            dialogMsgContent: function () {
                if (typeof this.$refs === 'object' && this.$refs.hasOwnProperty('dialog_output')) {
                    this.$nextTick(() => {
                        this.$refs['dialog_output'].scrollTop = this.$refs['dialog_output'].scrollHeight
                    })
                }
            }
        },
        mounted() {
            this.postForm = this.$deepCopy(this.data);
            this.postForm['menu_id'] = this.menu.id;
            if (this.menu.required_args) {
                this.$prompt('请输入要传递的参数', '提示').then(({value}) => {
                    this.do_exec(value)
                }).catch(() => this.$emit('close'))
            } else if (this.menu.required_confirm) {
                this.$confirm(`执行${this.menu.name}，是否继续？`, '提示').then(() => {
                    this.do_exec()
                }).catch(() => this.$emit('close'))
            } else {
                this.do_exec()
            }
        }
    }
</script>