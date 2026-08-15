/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Modal, Steps } from 'antd';
import { t } from 'libs';
import Setup1 from './Ext1Setup1';
import Setup2 from './Ext1Setup2';
import Setup3 from './Ext1Setup3';
import store from './store';
import styles from './index.module.css';

export default observer(function Ext1From() {
  const appName = store.currentRecord.name;
  let title;
  if (store.deploy.id) {
    title = store.isReadOnly ? t('查看常规发布 - {}', appName) : t('编辑常规发布 - {}', appName);
  } else {
    title = t('新建常规发布 - {}', appName)
  }
  return (
    <Modal
      visible
      width={800}
      maskClosable={false}
      title={title}
      onCancel={() => store.ext1Visible = false}
      footer={null}>
      <Steps current={store.page} className={styles.steps}>
        <Steps.Step key={0} title={t('基本配置')}/>
        <Steps.Step key={1} title={t('构建配置')}/>
        <Steps.Step key={2} title={t('发布配置')}/>
      </Steps>
      {store.page === 0 && <Setup1/>}
      {store.page === 1 && <Setup2/>}
      {store.page === 2 && <Setup3/>}
    </Modal>
  )
})
