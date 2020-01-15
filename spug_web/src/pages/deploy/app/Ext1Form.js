/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Modal, Steps } from 'antd';
import Setup1 from './Ext1Setup1';
import Setup2 from './Ext1Setup2';
import Setup3 from './Ext1Setup3';
import store from './store';
import styles from './index.module.css';

export default observer(function Ext1From() {
  return (
    <Modal
      visible
      width={800}
      maskClosable={false}
      title={store.deploy.id ? '编辑常规发布' : '新建常规发布'}
      onCancel={() => store.ext1Visible = false}
      footer={null}>
      <Steps current={store.page} className={styles.steps}>
        <Steps.Step key={0} title="基本配置"/>
        <Steps.Step key={1} title="发布主机"/>
        <Steps.Step key={2} title="任务配置"/>
      </Steps>
      {store.page === 0 && <Setup1/>}
      {store.page === 1 && <Setup2/>}
      {store.page === 2 && <Setup3/>}
    </Modal>
  )
})
