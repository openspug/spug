<template>
    <el-row :gutter="20">
        <el-row :gutter="20" v-model="top_data" >
            <el-col :span="6">
                <div class="grid-content bg-purple" >
                    <h3>用户</h3>
                    <p><span>{{ top_data.user_total }}</span>个</p>
                </div>
            </el-col>
            <el-col :span="6">
                <div class="grid-content bg-purple">
                    <h3>主机</h3>
                    <p><span>{{ top_data.host_total }}</span>台</p>
                </div>
            </el-col>
            <el-col :span="6">
                <div class="grid-content bg-purple">
                    <h3>应用</h3>
                    <p><span>{{ top_data.app_total }}</span>个</p>
                </div>
            </el-col>
            <el-col :span="6">
                <div class="grid-content bg-purple">
                    <h3>任务</h3>
                    <p><span>{{ top_data.job_total }}</span>个</p>
                </div>
            </el-col>
        </el-row>
        <el-row :gutter="20">
            <el-col :span="18">
                <div id="PublishBar" style="width:100%; height:200px;"></div>
            </el-col>
            <el-col :span="6">
                <div id="DeployPie" style="width:100%; height:200px;"></div>
            </el-col>
        </el-row>

        <el-row :gutter="20">
            <el-col :span="12">
                <div id="HostBar" style="width:100%; height:200px;"></div>
            </el-col>
            <el-col :span="6">
                <div id="ContainerPie" style="width:100%; height:200px;"></div>
            </el-col>
            <el-col :span="6">
                <div id="AlertsBar" style="width:100%; height:200px;"></div>
            </el-col>

        </el-row>
    </el-row>
</template>

<style>
    .el-row {
        margin-bottom: 20px;
    &:last-child {
         margin-bottom: 0;
     }
    }
    .el-col {
        border-radius: 4px;
    }
    .bg-purple-dark {
        background: #F3F3F3;
    }
    .bg-purple {
        text-align: center;
        background: #f8f8ff;
    }
    .bg-purple h3{
        font-size: 14px;
        margin: 0;
        padding: 10px 0;
        color: #888;
    }
    .bg-purple p{
        font-size: 14px;
        margin: 0;
        padding: 0;
        color: #666;
    }
    .bg-purple p span{
        font-size: 28px;
        font-weight: bold;
        color: orange;
    }
    .bg-purple-light {
        background: #e5e9f2;
    }
    .grid-content {
        border-radius: 5px;
        min-height: 80px;
    }
    .row-bg {
        padding: 10px 0;
        background-color: #f9fafc;
    }
    .echarts{
        width: 100%!important;
        height: 250px!important;
    }
</style>


<script>
    import echarts from 'echarts';
    export default {
        data() {
            return {
                top_data:{
                    user_total: '',
                },
                hostBar: null,
                publishBar: null,
                alertsBar: null,
                containerPie:null,
            }
        },
        methods: {
            get_top_info(){
                this.$http.get(`/api/home/`).then(res => {
                    this.top_data = res.result;
                }, res => this.$layer_message(res.result))
            },
            publishBarChart(){
                this.publishBar = echarts.init(document.getElementById('PublishBar'));
                this.publishBar.setOption(
                    {
                        color: ['#3CB371'],
                        tooltip : {
                            trigger: 'axis',
                            axisPointer : {            // 坐标轴指示器，坐标轴触发有效
                                type : 'line'        // 默认为直线，可选为：'line' | 'shadow'
                            }
                        },
                        title: {
                            text: '发布趋势',
                            x: 'center'
                        },
                        xAxis: {
                            type: 'category',
                            data: ["1日","2日","3日","4日","5日","6日","7日","8日","9日","10日","11日","12日","13日"
                                ,"14日","15日","16日","17日","18日","19日","20日","21日","22日","23日","24日","25日","26日","27日","28日","29日","30日"],
                            axisTick: {
                                alignWithLabel: true
                            }
                        },
                        yAxis: {
                            type: 'value'
                        },
                        series: [{
                            name: '次数',
                            type: 'bar',
                            data: [1,3,2,1,5,8,10,1,5,1,2,2,1,1,2,3,4,5,1,6,7,1,1,5,1,2,2,1,1,5]
                        }]
                    }

                )
            },
            deployPieChart(){
                this.deployPie = echarts.init(document.getElementById('DeployPie'));
                this.deployPie.setOption(
                    {
                        color: ['#0db38c','#e7552d','#b33349','#e7aa1b','#6f4fb3',],
                        title : {
                            text: '应用部署统计',
                            x:'center'
                        },
                        tooltip : {
                            trigger: 'item',
                            formatter: "{a} <br/>{b} : {c} ({d}%)"
                        },
                        legend: {
                            type: 'scroll',
                            orient: 'vertical',
                            right: 10,
                            top: 20,
                            bottom: 20,
                            data: ['CGI', 'SOA','Mobile','Weixin','IOS'],

//                            selected: data.selected
                        },
                        series : [
                            {
                                name: '实例数',
                                type: 'pie',
                                radius : '55%',
                                center: ['40%', '50%'],
                                data:[
                                    {value:8, name: 'CGI'},
                                    {value:5, name: 'SOA'},
                                    {value:3, name: 'Mobile'},
                                    {value:2, name: 'Weixin'},
                                    {value:7, name: 'IOS'}
                                ],
                                itemStyle: {
                                    emphasis: {
                                        shadowBlur: 10,
                                        shadowOffsetX: 0,
                                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                                    }
                                }
                            }
                        ]
                    }


                );

            },
            drawBarChart() {
                this.hostBar = echarts.init(document.getElementById('HostBar'));
                this.hostBar.setOption({
                    color: '#e7a017',
                    title: {
                        text: '主机数量统计',
                        x: 'center'
                    },
                    tooltip: {
                        trigger: 'axis',
                        axisPointer: {
                            type: 'shadow'
                        }
                    },
                    legend: {
//                        data: ['测试', '线上', 'GAMMA']
                    },
                    grid: {
                        left: '3%',
                        right: '4%',
                        bottom: '3%',
                        containLabel: true
                    },
                    xAxis: {
                        type: 'value',
                        boundaryGap: [0, 0.01]
                    },
                    yAxis: {
                        type: 'category',
                        data: ['测试', '线上', 'GAMMA']
                    },
                    series: [
                        {
                            type: 'bar',
                            data: [3,8,2]
                        },
                    ]
                });
            },
            containerPieChart(){
                this.containerPie = echarts.init(document.getElementById('ContainerPie'));
                this.containerPie.setOption({
                    color: ['#0db38c','#e7a017','#b32945',],
                    title: {
                        text: '容器状态',
                        x: 'center'
                    },
                    tooltip: {
                        trigger: 'item',
                        formatter: "{a} <br/>{b}: {c} ({d}%)"
                    },
                    legend: {
                        orient: 'vertical',
                        x: 'left',
                        data: ['正常', '异常', '已终止']
                    },
                    series: [
                        {
                            name:'容器状态',
                            type:'pie',
                            radius: ['50%', '70%'],
                            avoidLabelOverlap: false,
                            label: {
                                normal: {
                                    show: false,
                                    position: 'center'
                                },
                                emphasis: {
                                    show: true,
                                    textStyle: {
                                        fontSize: '30',
                                        fontWeight: 'bold'
                                    }
                                }
                            },
                            labelLine: {
                                normal: {
                                    show: false
                                }
                            },
                            data:[
                                {value:19, name:'正常'},
                                {value:1, name:'异常'},
                                {value:2, name:'已终止'}
                            ]
                        }
                    ]
                });
            },
            alertsBarCharts(){
                this.alertsBar = echarts.init(document.getElementById('AlertsBar'));
                this.alertsBar.setOption({
                    color: ['#3CB371'],
                    title: {
                        text: '告警趋势',
                        x: 'center'
                    },
                    tooltip: {},
                    xAxis: {
                        data: ["1日","2日","3日","4日","5日","6日","7日","8日","9日","10日","11日","12日","13日","14日","15日","16日"]
                    },
                    yAxis: {

                    },
                    series: [{
                        name: '次数',
                        type: 'bar',
                        data: [1,3,2,1,5,8,10,1,5,1,2,2,1,3,5,1,2,3]
                    }]
                },

                )

            },

            drawCharts() {
                this.publishBarChart();
                this.drawBarChart();
                this.deployPieChart();
                this.containerPieChart();
                this.alertsBarCharts();
            },

        },
        created () {
            this.get_top_info();

        },

        mounted: function () {
            this.drawCharts()
        },
        updated: function () {
            this.drawCharts()
        }



    }
</script>