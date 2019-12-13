import React from 'react';
import { observer } from 'mobx-react';
import { Modal, Steps } from 'antd';
import Setup1 from './Setup1';
import Setup2 from './Setup2';
import Setup3 from './Setup3';
import store from './store';
import styles from './index.module.css';

export default observer(function () {
  return (
    <Modal
      visible
      width={800}
      maskClosable={false}
      title={store.record.id ? '编辑常规发布' : '新建常规发布'}
      onCancel={() => store.ext1Visible = false}
      footer={null}>
      <Steps current={store.page} className={styles.steps}>
        <Steps.Step key={0} title="基本配置"/>
        <Steps.Step key={1} title="目标集群"/>
        <Steps.Step key={2} title="任务配置"/>
      </Steps>
      {store.page === 0 && <Setup1/>}
      {store.page === 1 && <Setup2/>}
      {store.page === 2 && <Setup3/>}
    </Modal>
  )
})