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
import Ask from './Ask';
import S from './store';
import css from './index.module.less';

function Index() {
  function handleClose() {
    S.open = false
    S.token = false
  }

  return (
    <Modal
      open={S.open}
      width={S.token ? '80%' : '540px'}
      title={S.token ? '执行控制台' : '执行参数设置'}
      footer={null}
      destroyOnClose
      maskClosable={false}
      wrapClassName={css.fade}
      afterClose={S.initial}
      onCancel={handleClose}>
      <Ask/>
      {S.token ? (
        <Row>
          <Sider/>
          <Body/>
        </Row>
      ) : null}
    </Modal>
  )
}

export default observer(Index)
