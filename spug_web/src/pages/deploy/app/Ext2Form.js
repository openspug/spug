/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Modal, Steps } from 'antd';
import { t } from 'libs';
import styles from './index.module.css';
import Setup1 from './Ext2Setup1';
import Setup2 from './Ext2Setup2';
import store from './store';

export default observer(function Ext2From() {
  const appName = store.currentRecord.name;
  let title;
  if (store.deploy.id) {
    title = store.isReadOnly ? t('查看自定义发布 - {}', appName) : t('编辑自定义发布 - {}', appName);
  } else {
    title = t('新建自定义发布 - {}', appName)
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
        <Steps.Step key={0} title={t('基本配置')}/>
        <Steps.Step key={1} title={t('执行动作')}/>
      </Steps>
      {store.page === 0 && <Setup1/>}
      {store.page === 1 && <Setup2/>}
    </Modal>
  )
})
