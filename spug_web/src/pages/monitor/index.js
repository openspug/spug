import React from 'react';
import { observer } from 'mobx-react';
import { AuthDiv, Breadcrumb } from 'components';
import ComTable from './Table';
import ComForm from './Form';
import MonitorCard from './MonitorCard';
import store from './store';

export default observer(function () {
  return (
    <AuthDiv auth="monitor.monitor.view">
      <Breadcrumb>
        <Breadcrumb.Item>首页</Breadcrumb.Item>
        <Breadcrumb.Item>监控中心</Breadcrumb.Item>
      </Breadcrumb>
      <MonitorCard/>
      <ComTable/>
      {store.formVisible && <ComForm/>}
    </AuthDiv>
  )
})
