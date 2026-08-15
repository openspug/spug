/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useEffect } from 'react';
import { observer } from 'mobx-react';
import { Modal, Steps } from 'antd';
import { t } from 'libs';
import Step1 from './Step1';
import Step2 from './Step2';
import Step3 from './Step3';
import store from './store';
import styles from './index.module.less';
import hostStore from '../host/store';

export default observer(function () {
  useEffect(() => {
    hostStore.initial()
    store.targets = store.record.id ? store.record['targets'] : [undefined];
  }, [])
  return (
    <Modal
      open
      width={800}
      maskClosable={false}
      title={store.record.id ? t('编辑任务') : t('新建任务')}
      onCancel={() => store.formVisible = false}
      footer={null}>
      <Steps
        current={store.page}
        className={styles.steps}
        items={[
          {title: t('创建任务')},
          {title: t('设置触发器')},
          {title: t('选择执行对象')}
        ]}/>
      <Step1 visible={store.page === 0}/>
      <Step2 visible={store.page === 1}/>
      <Step3 visible={store.page === 2}/>
    </Modal>
  )
})
