/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Modal, Steps } from 'antd';
import styles from './index.module.css';
import Setup1 from './Ext2Setup1';
import Setup2 from './Ext2Setup2';
import store from './store';

export default observer(function Ext2From() {
  const appName = store.currentRecord.name;
  let title = `自定义发布 - ${appName}`;
  if (store.deploy.id) {
    store.isReadOnly ? title = '查看' + title : title = '编辑' + title;
  } else {
    title = '新建' + title
  }
  return (
    <Modal
      visible
      width={900}
      maskClosable={false}
      title={title}
      onCancel={() => store.ext2Visible = false}
      footer={null}>
      <Steps current={store.page} className={styles.steps}>
        <Steps.Step key={0} title="基本配置"/>
        <Steps.Step key={1} title="执行动作"/>
      </Steps>
      {store.page === 0 && <Setup1/>}
      {store.page === 1 && <Setup2/>}
    </Modal>
  )
})
