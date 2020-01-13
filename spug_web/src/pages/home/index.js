import React from 'react';
import { Row, Col } from 'antd';
import StatisticsCard from './StatisticCard';
import AlarmTrend from './AlarmTrend';
import RequestTop from './RequestTop';
import DeployPie from './DeployPie';

class HomeIndex extends React.Component {
  render() {
    return (
      <React.Fragment>
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
      </React.Fragment>
    )
  }
}

export default HomeIndex
