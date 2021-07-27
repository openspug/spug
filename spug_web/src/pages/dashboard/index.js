/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { Row, Col } from 'antd';
import { AuthDiv } from 'components';
import StatisticsCard from './StatisticCard';
import AlarmTrend from './AlarmTrend';
import RequestTop from './RequestTop';
import LoginActive from './LoginActive';

class HomeIndex extends React.Component {
  render() {
    return (
      <AuthDiv auth="dashboard.dashboard.view">
        <StatisticsCard/>
        <AlarmTrend/>
        <Row style={{marginTop: 20}}>
          <Col span={13}>
            <RequestTop/>
          </Col>
          <Col span={10} offset={1}>
            <LoginActive/>
          </Col>
        </Row>
      </AuthDiv>
    )
  }
}

export default HomeIndex
