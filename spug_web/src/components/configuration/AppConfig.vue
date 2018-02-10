<template>
    <div>
        <el-dialog :title="owner.name" width="80%" :visible.sync="visible" :close-on-click-modal="false"
                   @close="$emit('close')">
            <el-row style="margin-bottom: 15px">
                <el-select v-model="cfg_type" @change="fetch">
                    <el-option value="" label="全部属性"></el-option>
                    <el-option value="private" label="私有属性"></el-option>
                    <el-option value="public" label="公共属性"></el-option>
                </el-select>
            </el-row>
            <el-table :data="tableData" border style="width: 100%" v-loading="tableLoading">
                <el-table-column fixed label="名称" min-width="250" show-overflow-tooltip>
                    <template slot-scope="scope">
                        <el-tag v-if="scope.row.type === 'private'" type="primary">私有</el-tag>
                        <el-tag v-if="scope.row.type === 'public'" type="success">公共</el-tag>
                        <span style="margin-left: 10px">{{ scope.row.name }}</span>
                    </template>
                </el-table-column>
                <el-table-column v-for="item in environments" :key="item.id" :label="item.name"
                                 :prop="'value.' + item.id" width="200px" show-overflow-tooltip></el-table-column>
                <el-table-column prop="desc" label="描述" min-width="200" show-overflow-tooltip></el-table-column>
                <el-table-column fixed="right" label="操作" width="160" v-if="has_permission('config_app_cfg_edit|config_app_cfg_del')">
                    <template slot-scope="scope">
                        <el-button v-if="has_permission('config_app_cfg_edit')" size="small" @click="editOpen(scope.row)">编辑</el-button>
                        <el-button v-if="has_permission('config_app_cfg_del')" size="small" type="danger" @click="delCommit(scope.row)"
                                   :loading="btnDelLoading[scope.row.id]">
                            删除
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
            <el-row style="text-align: right; margin-top: 15px" v-if="has_permission('config_app_cfg_add')">
                <el-dropdown @command="addOpen">
                    <el-button type="primary">新建配置<i class="el-icon-caret-bottom el-icon--right"></i></el-button>
                    <el-dropdown-menu slot="dropdown">
                        <el-dropdown-item command="private">私有属性</el-dropdown-item>
                        <el-dropdown-item command="public">公共属性</el-dropdown-item>
                    </el-dropdown-menu>
                </el-dropdown>
            </el-row>
        </el-dialog>
        <config-edit v-if="dialogVisible" :title="dialog_title" :form="cfgForm" :environments="environments"
                     :owner="owner" @close="closeEvent"></config-edit>
    </div>
</template>

<script>
    import ConfigEdit from './ConfigEdit.vue'
    export default {
        components: {
            'config-edit': ConfigEdit
        },
        props: ['owner', 'environments'],
        data () {
            return {
                dialog_title: undefined,
                owner_type: 'app',
                cfg_type: '',
                visible: true,
                tableLoading: false,
                btnDelLoading: false,
                btnSaveLoading: false,
                dialogVisible: false,
                tableData: [],
                cfgForm: this.init_cfgForm(),
            }
        },
        methods: {
            init_cfgForm (type) {
                return {
                    owner_type: 'app',
                    name: '',
                    type: type,
                    desc: '',
                    prefix: this.owner.identify.toUpperCase() + '_',
                    value: {}
                }
            },
            fetch () {
                this.tableLoading = true;
                let request_api = `/api/configuration/configs/${this.owner.id}?owner_type=${this.owner_type}`;
                if (this.cfg_type) request_api += `&cfg_type=${this.cfg_type}`;
                this.$http.get(request_api).then(res => {
                    res.result.sort(function (a, b) {
                        if (a.type === b.type) {
                            return (a.name < b.name) ? -1 : 1
                        } else {
                            return (a.type === 'private') ? -1 : 1
                        }
                    });
                    this.tableData = res.result;
                }, res => this.$layer_message(res.result)).finally(() => this.tableLoading = false)
            },
            addOpen (type) {
                if (type === 'private') {
                    this.dialog_title = '新建私有属性'
                } else {
                    this.dialog_title = '新建公共属性'
                }
                this.cfgForm = this.init_cfgForm(type);
                this.dialogVisible = true
            },
            editOpen(row) {
                this.cfgForm = this.$deepCopy(row);
                this.cfgForm.prefix = this.owner.identify.toUpperCase() + '_';
                if (this.cfgForm.type !== 'public') {
                    this.cfgForm.short_name = this.cfgForm.name
                } else {
                    this.cfgForm.short_name = this.cfgForm.name.replace(this.cfgForm.prefix, '');
                }
                this.dialogVisible = true
            },
            closeEvent () {
                this.dialogVisible = false;
                this.fetch()
            },
            delCommit (row) {
                this.btnDelLoading = {[row.id]: true};
                this.$http.delete(`/api/configuration/configs/${row.id}`)
                    .then(() => this.fetch(), res => this.$layer_message(res.result))
                    .finally(() => this.btnDelLoading = {})
            }
        },
        created () {
            this.fetch()
        }
    }
</script>