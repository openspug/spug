<template>
    <el-dialog title="设置触发器" :visible.sync="visible" @close="$emit('close')" :close-on-click-modal="false">
        <el-form label-width="80px" style="width: 100%">
            <el-form-item label="调度策略">
                <el-radio-group v-model="form.trigger">
                    <el-radio-button label="cron">周期</el-radio-button>
                    <el-radio-button label="interval">间隔</el-radio-button>
                    <el-radio-button label="date">定期</el-radio-button>
                </el-radio-group>
            </el-form-item>
            <el-form-item v-if="this.form.trigger == 'interval'" label="调度间隔">
                <el-input v-model="interval_trigger_args" placeholder="请输入调度间隔">
                    <template slot="append">秒</template>
                </el-input>
            </el-form-item>
            <el-form-item v-if="this.form.trigger == 'date'" label="选择时间">
                <el-date-picker v-model="date_trigger_args" type="datetime" format="yyyy-MM-dd HH:mm:ss"
                                placeholder="选择固定的时间"></el-date-picker>
            </el-form-item>
            <el-form-item v-if="this.form.trigger == 'cron'" label="选择月份">
                <el-select v-model="cron_trigger_args.month" multiple placeholder="默认每月">
                    <el-option v-for="(item, index) in month_list" :key="index" :label="item"
                               :value="index + 1"></el-option>
                </el-select>
            </el-form-item>
            <el-form-item v-if="this.form.trigger == 'cron'" label="输入日期">
                <el-select v-model="cron_trigger_args.day" multiple filterable allow-create default-first-option
                           placeholder="默认每天">
                    <el-option label="每月最后一天" value="last"></el-option>
                    <el-option label="示例：*/2 每2天" value="" disabled></el-option>
                    <el-option label="示例：1-7 1号到7号" value="" disabled></el-option>
                    <el-option label="示例：1,7 1号和7号" value="" disabled></el-option>
                    <el-option label="示例：1-7/2 1号到7号每2天" value="" disabled></el-option>
                    <el-option label="说明：取值范围(1-31)，输入多个值，则之间为或关系" value="" disabled></el-option>
                </el-select>
            </el-form-item>
            <el-form-item v-if="this.form.trigger == 'cron'" label="输入小时">
                <el-select v-model="cron_trigger_args.hour" multiple filterable allow-create default-first-option
                           placeholder="默认每小时">
                    <el-option label="示例：*/2  每2小时" value="" disabled></el-option>
                    <el-option label="示例：8-20 早8点到晚8点" value="" disabled></el-option>
                    <el-option label="示例：8,20 早8点和晚8点" value="" disabled></el-option>
                    <el-option label="示例：8-20/2 早8点到晚8点每2小时" value="" disabled></el-option>
                    <el-option label="说明：取值范围(0-23)，输入多个值，则之间为或关系" value="" disabled></el-option>
                </el-select>
            </el-form-item>
            <el-form-item v-if="this.form.trigger == 'cron'" label="输入分钟">
                <el-select v-model="cron_trigger_args.minute" multiple filterable allow-create default-first-option
                           placeholder="默认每分钟">
                    <el-option label="示例：*/5 每5分钟" value="" disabled></el-option>
                    <el-option label="示例：0-30 整点到第30分钟" value="" disabled></el-option>
                    <el-option label="示例：0,30 整点和第30分钟" value="" disabled></el-option>
                    <el-option label="示例：0-30/5 前半个小时每5分钟" value="" disabled></el-option>
                    <el-option label="说明：取值范围(0-59)，输入多个值，则之间为或关系" value="" disabled></el-option>
                </el-select>
            </el-form-item>
            <el-form-item v-if="this.form.trigger == 'cron'" label="输入每周">
                <el-select v-model="cron_trigger_args.day_of_week" multiple filterable allow-create default-first-option
                           placeholder="默认周一到周日都执行">
                    <el-option label="示例：5 每周五执行" value="" disabled></el-option>
                    <el-option label="示例：1-5 周一到周五执行" value="" disabled></el-option>
                    <el-option label="示例：1,2,3 周一周二周三执行" value="" disabled></el-option>
                    <el-option label="说明：取值范围(0-6)，0代表周日，6代表周六" value="" disabled></el-option>
                </el-select>
            </el-form-item>
            <el-form-item v-if="this.form.trigger == 'cron'" label="生效时间">
                <el-date-picker v-model="cron_trigger_args.range" type="daterange" placeholder="默认无"></el-date-picker>
            </el-form-item>
        </el-form>
        <div slot="footer">
            <el-button @click="visible = false">取消</el-button>
            <el-button type="primary" @click="saveCommit" :loading="btnSaveLoading">保存</el-button>
        </div>
    </el-dialog>
</template>

<script>
    const month_list = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    export default {
        props: ['form'],
        data () {
            return {
                visible: true,
                btnSaveLoading: false,
                cron_trigger_args: {month: [], day: [], hour: [], minute: [], day_of_week: [], range: ''},
                interval_trigger_args: '',
                date_trigger_args: '',
                month_list: month_list,
            }
        },
        methods: {
            handleCronArgs (args) {
                if (args.length) {
                    return args.join(',') + ';'
                } else {
                    return ';'
                }
            },
            saveCommit () {
                let form = {trigger: this.form.trigger};
                if (this.form.trigger === 'cron') {
                    form['trigger_args'] = ';';   //year
                    form['trigger_args'] += this.handleCronArgs(this.cron_trigger_args.month); //month
                    form['trigger_args'] += this.handleCronArgs(this.cron_trigger_args.day);  //day
                    form['trigger_args'] += ';';  //week
                    form['trigger_args'] += this.handleCronArgs(this.cron_trigger_args.day_of_week);  //day_of_week
                    form['trigger_args'] += this.handleCronArgs(this.cron_trigger_args.hour);  //hour
                    form['trigger_args'] += this.handleCronArgs(this.cron_trigger_args.minute);  //minute
                    form['trigger_args'] += ';';  //second
                    if (this.cron_trigger_args.range && this.cron_trigger_args.range.length) {
                        form['trigger_args'] += this.cron_trigger_args.range[0].format() + ';'; //start_date
                        form['trigger_args'] += this.cron_trigger_args.range[1].format()    //end_date
                    } else {
                        form['trigger_args'] += ';'
                    }
                } else if (this.form.trigger === 'interval') {
                    form['trigger_args'] = this.interval_trigger_args
                } else if (this.form.trigger === 'date') {
                    if (this.date_trigger_args.__proto__.hasOwnProperty('getDate')) {
                        form['trigger_args'] = this.date_trigger_args.format()
                    } else {
                        return this.$layer_message('请填写正确的日期类型！')
                    }
                } else {
                    return this.$layer_message('不支持的调度策略！')
                }
                this.btnSaveLoading = true;
                this.$http.post(`/api/schedule/jobs/${this.form.id}/trigger`, form).then(() => {
                    this.visible = false
                    this.$layer_message('提交成功', 'success');
                }, res => this.$layer_message(res.result)).finally(() => this.btnSaveLoading = false)
            }
        },
        created () {
            if (this.form.trigger === 'cron') {
                let tmp = this.form.trigger_args.split(';').map(x => {
                    return (x === '') ? [] : x.split(',')
                });
                this.cron_trigger_args = {
                    month: tmp[1],
                    day: tmp[2],
                    day_of_week: tmp[4],
                    hour: tmp[5],
                    minute: tmp[6],
                    range: (tmp[8].length) ? tmp.slice(8, 10) : []
                }
            } else if (this.form.trigger === 'date') {
                this.date_trigger_args = this.form.trigger_args
            } else if (this.form.trigger === 'interval') {
                this.interval_trigger_args = this.form.trigger_args
            }
        }
    }
</script>
