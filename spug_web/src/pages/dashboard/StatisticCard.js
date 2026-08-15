/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { Statistic, Card, Row, Col } from 'antd';
import { http, t } from 'libs';

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
            <Statistic
              title={t('应用')}
              value={res.app}
              suffix={<span style={{fontSize: 16}}>{t('个')}</span>}
              formatter={v => <a href="/deploy/app">{v}</a>}/>
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title={t('主机')}
              value={res.host}
              suffix={<span style={{fontSize: 16}}>{t('台')}</span>}
              formatter={v => <a href="/host">{v}</a>}/>
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title={t('任务')}
              value={res.task}
              suffix={<span style={{fontSize: 16}}>{t('个')}</span>}
              formatter={v => <a href="/schedule">{v}</a>}/>
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title={t('监控')}
              value={res['detection']}
              suffix={<span style={{fontSize: 16}}>{t('项')}</span>}
              formatter={v => <a href="/monitor">{v}</a>}/>
          </Card>
        </Col>
      </Row>
    )
  }
}
