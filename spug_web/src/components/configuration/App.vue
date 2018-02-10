<template>
    <div>
        <el-row>
            <el-col :span="8">
                <el-select v-model="app_group" @change="fetch()" placeholder="请选择分组">
                    <el-option v-for="item in groups" :key="item" :value="item"></el-option>
                </el-select>
            </el-col>
            <el-col :span="8" :offset="8" style="text-align: right">
                <el-button @click="fetch">刷新</el-button>
            </el-col>
        </el-row>

        <el-table :data="tableData" stripe style="width: 100%; margin-top: 20px" v-loading="tableLoading">
            <el-table-column prop="group" label="分组" show-overflow-tooltip></el-table-column>
            <el-table-column prop="name" label="名称" show-overflow-tooltip></el-table-column>
            <el-table-column prop="identify" label="标识" show-overflow-tooltip></el-table-column>
            <el-table-column prop="desc" label="描述" show-overflow-tooltip></el-table-column>
            <el-table-column label="操作" width="160" v-if="has_permission('config_app_view|config_app_rel_view')">
                <template slot-scope="scope">
                    <el-button v-if="has_permission('config_app_view')" size="small" type="primary" @click="cfgOpen(scope.row)">配置</el-button>
                    <el-button v-if="has_permission('config_app_rel_view')" size="small" type="primary" @click="relOpen(scope.row)">关系</el-button>
                </template>
            </el-table-column>
        </el-table>
        <app-config v-if="dialogCfgVisible" :owner="app" :environments="environments" @close="dialogCfgVisible = false"></app-config>
        <app-relationship v-if="dialogRelVisible" :owner="app" @close="dialogRelVisible = false"></app-relationship>
    </div>
</template>

<script>
    import AppConfig from './AppConfig.vue'
    import AppRelationship from './AppRel.vue'
    export default {
        components: {
            'app-config': AppConfig,
            'app-relationship': AppRelationship
        },
        data () {
            return {
                dialogTitle: null,
                cfg_type: null,
                owner_type: 'app',
                tableLoading: false,
                cfgTableLoading: false,
                dialogVisible: false,
                dialogCfgVisible: false,
                dialogRelVisible: false,
                environments: undefined,
                tableData: [],
                cfgTableData: [],
                app: {},
                app_group: null,
                groups: [],
            }
        },
        methods: {
            fetch () {
                this.tableLoading = true;
                let api_uri = '/api/deploy/apps/';
                if (this.app_group) api_uri += '?group=' + this.app_group;
                this.$http.get(api_uri).then(res => {
                    this.tableData = res.result;
                },res => this.$layer_message(res.result)).finally(() => this.tableLoading = false);
            },
            fetchCfg () {
                this.cfgTableLoading =  true;
                this.$http.get(`/api/configuration/configs/${this.app.id}?owner_type=${this.owner_type}`)
                    .then(res => this.cfgTableData = res.result, res => this.$layer_message(res.result))
                    .finally(() => this.cfgTableLoading = false)
            },
            fetchEnv () {
                this.$http.get('/api/configuration/environments/')
                    .then(res => {
                        this.environments = res.result
                    }, res => this.$layer_message(res.result));
            },
            fetchGroup(){
                this.$http.get('/api/deploy/apps/groups/').then(res => {
                    this.groups = res.result
                }, res => this.$layer_message(res.result))
            },
            cfgOpen (row) {
                if (! this.environments) this.fetchEnv();
                this.app = row;
                this.dialogCfgVisible = true;
                this.fetchCfg()
            },
            relOpen (row) {
                this.app = row;
                this.dialogRelVisible = true;
            },
            addOpen (type) {
                this.cfg_type = type;
                this.dialogVisible = true;
                if (this.cfg_type === 'private') {
                    this.dialogTitle = '新建私有属性'
                } else {
                    this.dialogTitle = '新建公共属性'
                }
            }
        },
        created () {
            this.fetch()
            this.fetchGroup()
        }
    }
</script>