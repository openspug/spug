/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Modal, Row } from 'antd';
import Sider from './Sider';
import Body from './Body';
import pS from '../store';
import S from './store';

function Index() {
  return (
    <Modal
      open={pS.consoleVisible}
      width="80%"
      title="运行控制台"
      footer={null}
      destroyOnClose
      afterClose={S.initial}
      onCancel={() => pS.consoleVisible = false}>
      <Row>
        <Sider/>
        <Body/>
      </Row>
    </Modal>
  )
}

export default observer(Index)
