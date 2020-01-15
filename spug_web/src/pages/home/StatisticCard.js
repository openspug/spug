/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import {Statistic, Card, Row, Col} from 'antd';
import { http } from 'libs';

export default class StatisticCard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      res: {}
    }
  }
  componentDidMount() {
    http.get('/api/home/statistic/')
      .then(res => this.setState({res}))
      .finally(() => this.setState({loading: false}))
  }

  render() {
    const {res, loading} = this.state;
    return (
      <Row gutter={16} style={{marginBottom: 20}}>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="应用" value={res.app} suffix="个" />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="主机" value={res.host} suffix="台" />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="任务" value={res.task} suffix="个" />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="监控" value={res['detection']} suffix="项" />
          </Card>
        </Col>
      </Row>
    )
  }
}
