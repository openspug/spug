/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useEffect, useState } from 'react';
import { observer, useLocalStore } from 'mobx-react';
import { Card, Progress, Modal, Collapse, Steps, Skeleton } from 'antd';
import { ShrinkOutlined, LoadingOutlined, CloseOutlined, CodeOutlined } from '@ant-design/icons';
import OutView from './OutView';
import { http, X_TOKEN } from 'libs';
import styles from './index.module.less';
import store from './store';

function Ext1Console(props) {
  const outputs = useLocalStore(() => ({}));
  const terms = useLocalStore(() => ({}));
  const [mini, setMini] = useState(false);
  const [visible, setVisible] = useState(true);
  const [fetching, setFetching] = useState(true);

  useEffect(props.request.mode === 'read' ? readDeploy : doDeploy, [])

  function readDeploy() {
    let socket;
    http.get(`/api/deploy/request/${props.request.id}/`)
      .then(res => {
        Object.assign(outputs, res.outputs)
        setTimeout(() => setFetching(false), 100)
        if (res.status === '2') {
          socket = _makeSocket(res.index)
        }
      })
    return () => socket && socket.close()
  }

  function doDeploy() {
    let socket;
    http.post(`/api/deploy/request/${props.request.id}/`)
      .then(res => {
        Object.assign(outputs, res.outputs)
        setTimeout(() => setFetching(false), 100)
        socket = _makeSocket()
        store.fetchInfo(props.request.id)
      })
    return () => socket && socket.close()
  }

  function _makeSocket(index = 0) {
    const token = props.request.id;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/api/ws/request/${token}/?x-token=${X_TOKEN}`);
    socket.onopen = () => socket.send(String(index));
    socket.onmessage = e => {
      if (e.data === 'pong') {
        socket.send(String(index))
      } else {
        index += 1;
        const {key, data, step, status} = JSON.parse(e.data);
        if (data !== undefined) {
          outputs[key].data += data
          if (terms[key]) terms[key].write(data)
        }
        if (step !== undefined) outputs[key].step = step;
        if (status !== undefined) outputs[key].status = status;
      }
    }
    socket.onerror = () => {
      for (let key of Object.keys(outputs)) {
        outputs[key]['status'] = 'error'
        outputs[key].data = '\u001b[31mWebsocket connection failed!\u001b[0m'
        if (terms[key]) {
          terms[key].reset()
          terms[key].write('\u001b[31mWebsocket connection failed!\u001b[0m')
        }
      }
    }
    return socket
  }

  function StepItem(props) {
    let icon = null;
    if (props.step === props.item.step && props.item.status !== 'error') {
      icon = <LoadingOutlined/>
    }
    return <Steps.Step {...props} icon={icon}/>
  }

  function switchMiniMode() {
    setMini(true)
    setVisible(false)
  }

  function handleSetTerm(term, key) {
    if (outputs[key] && outputs[key].data) {
      term.write(outputs[key].data)
    }
    terms[key] = term
  }

  function openTerminal(e, item) {
    e.stopPropagation()
    window.open(`/ssh?id=${item.id}`)
  }

  let {local, ...hosts} = outputs;
  return (
    <div>
      {mini && (
        <Card
          className={styles.item}
          bodyStyle={{padding: '8px 12px'}}
          onClick={() => setVisible(true)}>
          <div className={styles.header}>
            <div className={styles.title}>{props.request.name}</div>
            <CloseOutlined onClick={() => store.showConsole(props.request, true)}/>
          </div>
          {local && (
            <Progress
              percent={(local.step + 1) * 18}
              status={local.step === 100 ? 'success' : outputs.local.status === 'error' ? 'exception' : 'active'}/>
          )}
          {Object.values(hosts).map(item => (
            <Progress
              key={item.id}
              percent={(item.step + 1) * 18}
              status={item.step === 100 ? 'success' : item.status === 'error' ? 'exception' : 'active'}/>
          ))}
        </Card>
      )}
      <Modal
        visible={visible}
        width="70%"
        footer={null}
        maskClosable={false}
        className={styles.console}
        onCancel={() => store.showConsole(props.request, true)}
        title={[
          <span key="1">{props.request.name}</span>,
          <div key="2" className={styles.miniIcon} onClick={switchMiniMode}>
            <ShrinkOutlined/>
          </div>
        ]}>
        <Skeleton loading={fetching} active>
          {local && (
            <Collapse defaultActiveKey={['0']} className={styles.collapse} style={{marginBottom: 24}}>
              <Collapse.Panel header={(
                <div className={styles.header}>
                  <b className={styles.title}/>
                  <Steps size="small" className={styles.step} current={local.step} status={local.status} style={{margin: 0}}>
                    <StepItem title="构建准备" item={local} step={0}/>
                    <StepItem title="检出前任务" item={local} step={1}/>
                    <StepItem title="执行检出" item={local} step={2}/>
                    <StepItem title="检出后任务" item={local} step={3}/>
                    <StepItem title="执行打包" item={local} step={4}/>
                  </Steps>
                </div>
              )}>
                <OutView setTerm={term => handleSetTerm(term, 'local')}/>
              </Collapse.Panel>
            </Collapse>
          )}

          <Collapse defaultActiveKey="0" className={styles.collapse}>
            {Object.entries(hosts).map(([key, item], index) => (
              <Collapse.Panel
                key={index}
                header={
                  <div className={styles.header}>
                    <b className={styles.title}>{item.title}</b>
                    <Steps size="small" className={styles.step} current={item.step} status={item.status}>
                      <StepItem title="等待调度" item={item} step={0}/>
                      <StepItem title="数据准备" item={item} step={1}/>
                      <StepItem title="发布前任务" item={item} step={2}/>
                      <StepItem title="执行发布" item={item} step={3}/>
                      <StepItem title="发布后任务" item={item} step={4}/>
                    </Steps>
                    <CodeOutlined className={styles.codeIcon} onClick={e => openTerminal(e, item)}/>
                  </div>}>
                <OutView setTerm={term => handleSetTerm(term, key)}/>
              </Collapse.Panel>
            ))}
          </Collapse>
        </Skeleton>
      </Modal>
    </div>
  )

}

export default observer(Ext1Console)