<template>
  <div id="configuration_relation_chart" style="width: 100%; height: 100%">
  </div>
</template>

<script>
  import echarts from 'echarts';
  export default {
    data() {
      return {
        nodes_map: {},
        colors: ['#c23531', '#2f4554', '#61a0a8', '#d48265', '#91c7ae', '#749f83', '#ca8622', '#bda29a', '#6e7074', '#546570', '#c4ccd3']
      }
    },
    mounted() {
      let chart = echarts.init(document.getElementById('configuration_relation_chart'));
      let nodes = [];
      let links = [];
      chart.showLoading();
      this.$http.get('/api/configuration/relationship/').then(res => {
        res.result.services.map(item => {
          this.nodes_map[item.id + '_s'] = item;
          nodes.push({
            id: item.id + '_s',
            name: item.name,
            symbolSize: 16,
            itemStyle: {
              color: '#66bdff'
            },
            label: {
              show: true
            },
          })
        });
        res.result.apps.map((item, index) => {
          this.nodes_map[item.id + '_a'] = item;
          nodes.push({
            id: item.id + '_a',
            name: item.name,
            symbolSize: 20,
            itemStyle: {
              color: this.colors[index % this.colors.length]
            },
            label: {
              show: true
            }
          })
        });
        res.result.relations.map(item => {
          let suffix = (item.d_type === 'app') ? '_a' : '_s';
          links.push({
            source: item.s_id + '_a',
            target: item.d_id + suffix
          })
        });
        chart.setOption({
          title: {
            text: '应用配置关系图',
          },
          tooltip: {
            show: true,
            formatter: (params) => {
              let des_body = '';
              let src_body = '';
              links.map(item => {
                if (params.data.id === item.source) {
                  src_body += `<tr><td>${this.nodes_map[item.target].name}</td><td>${this.nodes_map[item.target].desc}</td></tr>`
                }else if (params.data.id === item.target) {
                  des_body += `<tr><td>${this.nodes_map[item.source].name}</td><td>${this.nodes_map[item.source].desc}</td></tr>`
                }
              });
              return `依赖的应用：</br><table>${src_body}</table> </br>被依赖的应用：</br><table>${des_body}</table>`
            }
          },
          animationDurationUpdate: 1500,
          animationEasingUpdate: 'quinticInOut',
          series: [
            {
              name: '应用配置关系图',
              type: 'graph',
              layout: 'circular',
              circular: {
                rotateLabel: true
              },
              focusNodeAdjacency: true,
              data: nodes,
              links: links,
              label: {
                show: true,
                position: 'right',
                formatter: '{b}'
              },
              edgeLabel: {
                show: true,
                formatter: ''
              },
              lineStyle: {
                color: 'source',
                curveness: 0.3
              }
            }
          ]
        })
      }, res => this.$layer_message(res.result)).finally(() => chart.hideLoading())
    }
  }
</script>