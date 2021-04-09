/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Row, Col, Button } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import { AuthDiv, Breadcrumb } from 'components';
import Group from './Group';
import ComTable from './Table';
import ComForm from './Form';
import ComImport from './Import';
import Detail from './Detail';
import Selector from './Selector';
import store from './store';

export default observer(function () {
  function openTerminal() {
    window.open('/ssh')
  }

  return (
    <AuthDiv auth="host.host.view">
      <Breadcrumb extra={<Button type="primary" icon={<RobotOutlined/>} onClick={openTerminal}>Web 终端</Button>}>
        <Breadcrumb.Item>首页</Breadcrumb.Item>
        <Breadcrumb.Item>主机管理</Breadcrumb.Item>
      </Breadcrumb>

      <Row gutter={12}>
        <Col span={6}>
          <Group/>
        </Col>
        <Col span={18}>
          <ComTable/>
        </Col>
      </Row>

      <Detail/>
      {store.formVisible && <ComForm/>}
      {store.importVisible && <ComImport/>}
      {store.selectorVisible &&
      <Selector oneGroup={!store.addByCopy} onCancel={() => store.selectorVisible = false} onOk={store.updateGroup}/>}
    </AuthDiv>
  );
})
