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
    S.dynamicParams = null
  }

  return (
    <Modal
      open={S.open}
      width={S.dynamicParams ? '540px' : '80%'}
      title={S.dynamicParams ? '执行参数设置' : '执行控制台'}
      footer={null}
      destroyOnClose
      maskClosable={false}
      wrapClassName={css.fade}
      afterClose={S.initial}
      onCancel={handleClose}>
      {S.dynamicParams ? (
        <Ask/>
      ) : (
        <Row>
          <Sider/>
          <Body/>
        </Row>
      )}
    </Modal>
  )
}

export default observer(Index)
