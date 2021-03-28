/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { Row, Col } from 'antd';
import { Breadcrumb } from 'components';
import NoticeIndex from './Notice';
import TodoIndex from './Todo';
import NavIndex from './Nav';

function HomeIndex() {
  return (
    <div>
      <Breadcrumb>
        <Breadcrumb.Item>首页</Breadcrumb.Item>
        <Breadcrumb.Item>工作台</Breadcrumb.Item>
      </Breadcrumb>
      <Row gutter={12}>
        <Col span={16}>
          <TodoIndex/>
        </Col>
        <Col span={8}>
          <NoticeIndex/>
        </Col>
      </Row>
      <NavIndex/>
    </div>
  )
}

export default HomeIndex