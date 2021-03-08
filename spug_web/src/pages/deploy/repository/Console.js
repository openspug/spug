/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { FullscreenOutlined, FullscreenExitOutlined, LoadingOutlined } from '@ant-design/icons';
import { Modal, Steps } from 'antd';
import { X_TOKEN, human_time } from 'libs';
import styles from './index.module.less';
import store from './store';

export default observer(function Console() {
  const [fullscreen, setFullscreen] = useState(false);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState('process')

  useEffect(() => {
    store.outputs = [`${human_time()} 建立连接...        `]
    let index = 0;
    const token = store.record.spug_version;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/api/ws/build/${token}/?x-token=${X_TOKEN}`);
    socket.onopen = () => socket.send(String(index));
    socket.onmessage = e => {
      if (e.data === 'pong') {
        socket.send(String(index))
      } else {
        index += 1;
        const {data, step, status} = JSON.parse(e.data);
        if (data !== undefined) store.outputs.push(data);
        if (step !== undefined) setStep(step);
        if (status !== undefined) setStatus(status);
      }
    }
    return () => {
      socket.close();
      store.outputs = []
    }
  }, [])

  function handleClose() {
    store.fetchRecords();
    store.logVisible = false
  }

  function StepItem(props) {
    let icon = null;
    if (props.step === step && status === 'process') {
      icon = <LoadingOutlined style={{fontSize: 32}}/>
    }
    return <Steps.Step {...props} icon={icon}/>
  }

  return (
    <Modal
      visible
      width={fullscreen ? '100%' : 1000}
      title={[
        <span key="1">构建控制台</span>,
        <div key="2" className={styles.fullscreen} onClick={() => setFullscreen(!fullscreen)}>
          {fullscreen ? <FullscreenExitOutlined/> : <FullscreenOutlined/>}
        </div>
      ]}
      footer={null}
      onCancel={handleClose}
      className={styles.console}
      maskClosable={false}>
      <Steps current={step} status={status}>
        <StepItem title="构建准备" step={0}/>
        <StepItem title="检出前任务" step={1}/>
        <StepItem title="执行检出" step={2}/>
        <StepItem title="检出后任务" step={3}/>
        <StepItem title="执行打包" step={4}/>
      </Steps>
      <pre className={styles.out}>{store.outputs}</pre>
    </Modal>
  )
})
