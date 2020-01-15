/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { Card } from 'antd';
import { Chart, Geom, Axis, Tooltip } from 'bizcharts';
import { http } from 'libs';

export default class RequestTop extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      res: []
    };
  }

  componentDidMount() {
    http.get('/api/home/request/')
      .then(res => this.setState({res}))
      .finally(() => this.setState({loading: false}))
  }

  render() {
    const {res, loading} = this.state;
    return (
      <Card loading={loading} title="发布申请Top5">
        <Chart height={300} data={res} padding={[10, 0, 30, 35]} forceFit>
          <Axis name="name"/>
          <Axis name="count" title/>
          <Tooltip/>
          <Geom type="interval" position="name*count"/>
        </Chart>
      </Card>
    )
  }
}
