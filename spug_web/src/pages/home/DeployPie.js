/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { Card } from 'antd';
import { Chart, Geom, Axis, Tooltip, Coord, Guide, Label } from 'bizcharts';
import DataSet from "@antv/data-set";
import { http } from 'libs';

export default class AlarmTrend extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      host: 0,
      res: []
    };
  }

  componentDidMount() {
    http.get('/api/home/deploy/')
      .then(res => this.setState(res))
      .finally(() => this.setState({loading: false}))
  }

  render() {
    const {res, host, loading} = this.state;
    const dv = new DataSet.DataView();
    dv.source(res).transform({
      type: "percent",
      field: "count",
      dimension: "name",
      as: "percent"
    });
    const cols = {
      percent: {
        formatter: val => {
          val = val * 100 + "%";
          return val;
        }
      }
    };
    return (
      <Card loading={loading} title="应用部署">
        <Chart height={300} data={dv} scale={cols} padding={[0, 0, -40, 50]} forceFit>
          <Coord type={"theta"} radius={0.75} innerRadius={0.6}/>
          <Axis name="percent"/>
          <Tooltip showTitle={false}/>
          <Guide>
            <Guide.Html
              position={["50%", "50%"]}
              html={`<div style="color:#8c8c8c;font-size:1.16em;text-align: center;width: 10em;">主机<br><span style="color:#262626;font-size:2.5em">${host}</span>台</div>`}
              alignX="middle"
              alignY="middle"
            />
          </Guide>
          <Geom
            type="intervalStack"
            position="percent"
            color="name"
            tooltip={[
              "name*count",
              (name, count) => {
                return {
                  name: name,
                  value: count + '台'
                };
              }
            ]}
            style={{lineWidth: 1, stroke: "#fff"}}>
            <Label
              content="percent"
              formatter={(val, item) => {
                return item.point.name + ": " + val;
              }}
            />
          </Geom>
        </Chart>
      </Card>
    )
  }
}
