<template>
    <el-dialog :title="title" :visible.sync="visible" :close-on-click-modal="false" @close="$emit('close')">
        <el-form :model="form" label-width="80px" label-position="left">
            <el-form-item v-if="!form.alias" label="名称" required>
                <el-input v-model="form.short_name" placeholder="请输入内容">
                    <template v-if="form.type == 'public'" slot="prepend">{{ form.prefix }}</template>
                </el-input>
            </el-form-item>
            <el-form-item v-if="!form.alias" label="描述" required>
                <el-input v-model="form.desc" type="textarea" autosize placeholder="请输入内容"></el-input>
            </el-form-item>
            <el-form-item v-for="env in environments" :key="env.id" :label="env.name">
                <el-input v-model="form.value[env.id]"></el-input>
            </el-form-item>
        </el-form>
        <div slot="footer">
            <el-button @click="visible = false">取消</el-button>
            <el-button type="primary" @click="saveCommit" :loading="btnSaveLoading">保存</el-button>
        </div>
    </el-dialog>
</template>

<script>
    export default {
        props: ['title', 'form', 'owner', 'environments'],
        data () {
            return {
                visible: true,
                btnSaveLoading: false,
            }
        },
        methods: {
            saveCommit () {
                this.btnSaveLoading = true;
                let request;
                if (this.form.id) {
                    request = this.$http.put(`/api/configuration/configs/${this.form.id}`, this.form)
                } else {
                    request = this.$http.post(`/api/configuration/configs/${this.owner.id}`, this.form)
                }
                request.then(() => this.visible = false, res => this.$layer_message(res.result))
                    .finally(() => this.btnSaveLoading = false)
            }
        }
    }
</script>