import React from 'react';
import {observer} from 'mobx-react';
import { Card, Row, Col } from 'antd';
import { StatisticsCard } from "../../components";
import { Chart, Geom, Axis, Tooltip, Coord, Guide, Label } from 'bizcharts';
import DataSet from "@antv/data-set";
import store from './store';

@observer
class HomeIndex extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      failure: 0
    };
    this.data = [
      {region: '北京机房', count: 275},
      {region: '上海机房', count: 115},
      {region: '杭州机房', count: 350},
    ];
    this.cols = {
      region: {alias: '机房'},
      count: {alias: '服务器数量'}
    };
    this.data2 = [
      {item: 'RPC-User', count: 5},
      {item: 'SOA', count: 2},
      {item: 'RPC-Order', count: 10},
      {item: 'RPC-Goods', count: 10},
      {item: 'WebServer', count: 5},
    ];
    this.dv = new DataSet.DataView();
    this.dv.source(this.data2).transform({
      type: "percent",
      field: "count",
      dimension: "item",
      as: "percent"
    });
    this.cols2 = {
      percent: {
        formatter: val => {
          val = (val * 100).toFixed(0) + "%";
          return val;
        }
      }
    };

  }

  componentDidMount() {
    // store.fetchInfo()
  }

  render() {
    const data = [
      {
        year: "1991",
        value: 3
      },
      {
        year: "1992",
        value: 4
      },
      {
        year: "1993",
        value: 3.5
      },
      {
        year: "1994",
        value: 5
      },
      {
        year: "1995",
        value: 4.9
      },
      {
        year: "1996",
        value: 6
      },
      {
        year: "1997",
        value: 7
      },
      {
        year: "1998",
        value: 9
      },
      {
        year: "1999",
        value: 13
      }
    ];
    const cols = {
      value: {
        min: 0
      },
      year: {
        range: [0, 1]
      }
    };
    return (
        <React.Fragment>
          <StatisticsCard loading={store.isFetching}>
            <StatisticsCard.Item title="应用数量" value={100}/>
            <StatisticsCard.Item title="任务数量" value={32}/>
            <StatisticsCard.Item title="正常服务" value={<span style={{color: 'green'}}>99</span>}/>
            <StatisticsCard.Item
                title="异常服务"
                bordered={false}
                value={<span style={{color: 'red'}}>1</span>}/>
                {/*value={<span style={{color: 'red'}}>{store.info.failure}</span>}/>*/}
          </StatisticsCard>
          <div>
            <Card title="报警趋势">
              <Chart height={400} data={data} scale={cols} forceFit>
                <Axis name="year" />
                <Axis name="value" />
                <Tooltip
                    crosshairs={{
                      type: "y"
                    }}
                />
                <Geom type="line" position="year*value" size={2} />
                <Geom
                    type="point"
                    position="year*value"
                    size={4}
                    shape={"circle"}
                    style={{
                      stroke: "#fff",
                      lineWidth: 1
                    }}
                />
              </Chart>
            </Card>
          </div>
          <div style={{ marginTop: "15px" }}>
          <Row>
            <Col span={13}>
              <Card title="机房分布">
                <Chart height={300} data={this.data} scale={this.cols} padding={[10, 0, 30, 35]} forceFit>
                  <Axis name="region"/>
                  <Axis name="count" title/>
                  <Tooltip/>
                  <Geom type="interval" position="region*count"/>
                </Chart>
              </Card>
            </Col>
            <Col span={10} offset={1}>
              <Card title="应用部署">
                <Chart
                    height={300}
                    data={this.dv}
                    scale={this.cols2}
                    padding={[0, 0, -40, 50]}
                    forceFit
                >
                  <Coord type={"theta"} radius={0.75} innerRadius={0.6}/>
                  <Axis name="percent"/>
                  <Tooltip showTitle={false}/>
                  <Guide>
                    <Guide.Html
                        position={["50%", "50%"]}
                        html="<div style=&quot;color:#8c8c8c;font-size:1.16em;text-align: center;width: 10em;&quot;>主机<br><span style=&quot;color:#262626;font-size:2.5em&quot;>32</span>台</div>"
                        alignX="middle"
                        alignY="middle"
                    />
                  </Guide>
                  <Geom
                      type="intervalStack"
                      position="percent"
                      color="item"
                      tooltip={[
                        "item*percent",
                        (item, percent) => {
                          percent = percent * 100 + "%";
                          return {
                            name: item,
                            value: percent
                          };
                        }
                      ]}
                      style={{lineWidth: 1, stroke: "#fff"}}>
                    <Label
                        content="percent"
                        formatter={(val, item) => {
                          return item.point.item + ": " + val;
                        }}
                    />
                  </Geom>
                </Chart>
              </Card>
            </Col>
          </Row>
          </div>
        </React.Fragment>
    )
  }
}

export default HomeIndex
