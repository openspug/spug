/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Modal, Steps } from 'antd';
import styles from './index.module.css';
import Setup1 from './Ext2Setup1';
import Setup2 from './Ext2Setup2';
import Setup3 from './Ext2Setup3';
import store from './store';

export default observer(function Ext2From() {
  return (
    <Modal
      visible
      width={800}
      maskClosable={false}
      title={store.deploy.id ? '编辑自定义发布' : '新建自定义发布'}
      onCancel={() => store.ext2Visible = false}
      footer={null}>
      <Steps current={store.page} className={styles.steps}>
        <Steps.Step key={0} title="基本配置"/>
        <Steps.Step key={1} title="发布主机"/>
        <Steps.Step key={2} title="执行动作"/>
      </Steps>
      {store.page === 0 && <Setup1/>}
      {store.page === 1 && <Setup2/>}
      {store.page === 2 && <Setup3/>}
    </Modal>
  )
})
