/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useEffect, useState } from 'react';
import { observer, useLocalStore } from 'mobx-react';
import { Card, Progress, Modal, Collapse, Steps } from 'antd';
import { ShrinkOutlined, CaretRightOutlined, LoadingOutlined, CloseOutlined } from '@ant-design/icons';
import OutView from './OutView';
import { http, X_TOKEN } from 'libs';
import styles from './index.module.less';
import store from './store';

function Ext2Console(props) {
  const outputs = useLocalStore(() => ({local: {id: 'local'}}));
  const [sActions, setSActions] = useState([]);
  const [hActions, setHActions] = useState([]);

  useEffect(props.request.mode === 'read' ? readDeploy : doDeploy, [])

  function readDeploy() {
    let socket;
    http.get(`/api/deploy/request/${props.request.id}/`)
      .then(res => {
        setSActions(res.s_actions);
        setHActions(res.h_actions);
        Object.assign(outputs, res.outputs)
        if (res.status === '2') {
          socket = _makeSocket()
        }
      })
    return () => socket && socket.close()
  }

  function doDeploy() {
    let socket;
    http.post(`/api/deploy/request/${props.request.id}/`)
      .then(res => {
        setSActions(res.s_actions);
        setHActions(res.h_actions);
        Object.assign(outputs, res.outputs)
        socket = _makeSocket()
      })
    return () => socket && socket.close()
  }

  function _makeSocket() {
    let index = 0;
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
        if (data !== undefined) outputs[key].data.push(data);
        if (step !== undefined) outputs[key].step = step;
        if (status !== undefined) outputs[key].status = status;
      }
    }
    return socket
  }

  function StepItem(props) {
    let icon = null;
    if (props.step === props.item.step && props.item.status !== 'error') {
      if (props.item.id === 'local' || outputs.local.step === 100) {
        icon = <LoadingOutlined/>
      }
    }
    return <Steps.Step {...props} icon={icon}/>
  }

  function switchMiniMode() {
    const value = store.tabModes[props.request.id];
    store.tabModes[props.request.id] = !value
  }

  const hostOutputs = Object.values(outputs).filter(x => x.id !== 'local');
  return store.tabModes[props.request.id] ? (
    <Card
      className={styles.item}
      bodyStyle={{padding: '8px 12px'}}
      onClick={switchMiniMode}>
      <div className={styles.header}>
        <div className={styles.title}>{props.request.name}</div>
        <CloseOutlined onClick={() => store.showConsole(props.request, true)}/>
      </div>
      <Progress percent={(outputs.local.step + 1) * (90 / (1 + sActions.length)).toFixed(0)}
                status={outputs.local.step === 100 ? 'success' : outputs.local.status === 'error' ? 'exception' : 'active'}/>
      {Object.values(outputs).filter(x => x.id !== 'local').map(item => (
        <Progress
          key={item.id}
          percent={item.step * (90 / (hActions.length).toFixed(0))}
          status={item.step === 100 ? 'success' : item.status === 'error' ? 'exception' : 'active'}/>
      ))}
    </Card>
  ) : (
    <Modal
      visible
      width={1000}
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
      <Collapse defaultActiveKey="0" className={styles.collapse}>
        <Collapse.Panel header={(
          <div className={styles.header}>
            <b className={styles.title}/>
            <Steps size="small" className={styles.step} current={outputs.local.step} status={outputs.local.status}>
              <StepItem title="建立连接" item={outputs.local} step={0}/>
              {sActions.map((item, index) => (
                <StepItem key={index} title={item.title} item={outputs.local} step={index + 1}/>
              ))}
            </Steps>
          </div>
        )}>
          <OutView records={outputs.local.data}/>
        </Collapse.Panel>
      </Collapse>
      {hostOutputs.length > 0 && (
        <Collapse
          defaultActiveKey="0"
          className={styles.collapse}
          style={{marginTop: 24}}
          expandIcon={({isActive}) => <CaretRightOutlined style={{fontSize: 16}} rotate={isActive ? 90 : 0}/>}>
          {hostOutputs.map((item, index) => (
            <Collapse.Panel
              key={index}
              header={
                <div className={styles.header}>
                  <b className={styles.title}>{item.title}</b>
                  <Steps size="small" className={styles.step} current={item.step} status={item.status}>
                    <StepItem title="等待调度" item={item} step={0}/>
                    {hActions.map((action, index) => (
                      <StepItem key={index} title={action.title} item={item} step={index + 1}/>
                    ))}
                  </Steps>
                </div>}>
              <OutView records={item.data}/>
            </Collapse.Panel>
          ))}
        </Collapse>
      )}
    </Modal>
  )
}

export default observer(Ext2Console)