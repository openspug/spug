/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Row, Col } from 'antd';
import { AuthDiv, Breadcrumb } from 'components';
import Group from './Group';
import ComTable from './Table';
import ComForm from './Form';
import ComImport from './Import';
import store from './store';

export default observer(function () {
  return (
    <AuthDiv auth="host.host.view">
      <Breadcrumb>
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

      {store.formVisible && <ComForm/>}
      {store.importVisible && <ComImport/>}
    </AuthDiv>
  );
})
