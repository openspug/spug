/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useEffect } from 'react';
import { observer } from 'mobx-react';
import { Modal, Steps } from 'antd';
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
      visible
      width={800}
      maskClosable={false}
      title={store.record.id ? '编辑任务' : '新建任务'}
      onCancel={() => store.formVisible = false}
      footer={null}>
      <Steps current={store.page} className={styles.steps}>
        <Steps.Step key={0} title="创建任务"/>
        <Steps.Step key={1} title="设置触发器"/>
        <Steps.Step key={2} title="选择执行对象"/>
      </Steps>
      <Step1 visible={store.page === 0}/>
      <Step2 visible={store.page === 1}/>
      <Step3 visible={store.page === 2}/>
    </Modal>
  )
})
