/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { Row, Col } from 'antd';
import { AuthDiv } from 'components';
import StatisticsCard from './StatisticCard';
import AlarmTrend from './AlarmTrend';
import RequestTop from './RequestTop';
import DeployPie from './DeployPie';

class HomeIndex extends React.Component {
  render() {
    return (
      <AuthDiv auth="home.home.view">
        <StatisticsCard/>
        <AlarmTrend/>
        <Row style={{marginTop: 20}}>
          <Col span={13}>
            <RequestTop/>
          </Col>
          <Col span={10} offset={1}>
            <DeployPie/>
          </Col>
        </Row>
      </AuthDiv>
    )
  }
}

export default HomeIndex
