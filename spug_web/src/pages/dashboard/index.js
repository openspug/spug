import React from 'react';
import { AuthDiv } from 'components';
import StatisticsCard from './StatisticCard';
import AlarmTrend from './AlarmTrend';
import RequestTop from './RequestTop';

class HomeIndex extends React.Component {
  render() {
    return (
      <AuthDiv auth="dashboard.dashboard.view">
        <StatisticsCard/>
        <AlarmTrend/>
        <RequestTop/>
      </AuthDiv>
    )
  }
}

export default HomeIndex
