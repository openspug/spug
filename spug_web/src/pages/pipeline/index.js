/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { AuthDiv, Breadcrumb } from 'components';
import Table from './Table';
import Console from './console';


function Index() {
  return (
    <AuthDiv auth="pipeline.pipeline.view">
        <Breadcrumb>
        <Breadcrumb.Item>首页</Breadcrumb.Item>
        <Breadcrumb.Item>流水线</Breadcrumb.Item>
      </Breadcrumb>
      <Table/>
      <Console/>
    </AuthDiv>
  )
}

export default observer(Index)
