/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import {
  CheckCircleTwoTone,
  LoadingOutlined,
  WarningTwoTone,
  FullscreenOutlined,
  FullscreenExitOutlined,
  CodeOutlined
} from '@ant-design/icons';
import { Modal, Collapse, Tooltip } from 'antd';
import OutView from './OutView';
import { X_TOKEN } from 'libs';
import styles from './index.module.less';
import store from './store';


@observer
class ExecConsole extends React.Component {
  constructor(props) {
    super(props);
    this.lastOutputs = {};
    this.socket = null;
    this.terms = {};
    this.outputs = {};
    this.state = {
      activeKey: Object.keys(store.outputs)[0],
      isFullscreen: false
    }
  }

  componentDidMount() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.socket = new WebSocket(`${protocol}//${window.location.host}/api/ws/exec/${store.token}/?x-token=${X_TOKEN}`);
    this.socket.onopen = () => {
      for (let key of Object.keys(store.outputs)) {
        this.handleWrite(key, '\x1b[36m### Waiting for scheduling ...\x1b[0m\r\n')
      }
      this.socket.send('ok');
    };
    this.socket.onmessage = e => {
      if (e.data === 'pong') {
        this.socket.send('ping')
      } else {
        const {key, data, status} = JSON.parse(e.data);
        if (status !== undefined) store.outputs[key].status = status;
        if (data) {
          this.handleWrite(key, data);
          const tmp = data.trim();
          if (tmp) this.lastOutputs[key] = tmp.split('\r\n').slice(-1)
        }
      }
    };
    this.socket.onerror = () => {
      for (let key of Object.keys(store.outputs)) {
        store.outputs[key]['status'] = 'websocket error'
        if (this.terms[key]) {
          this.terms[key].write('\x1b[31mWebsocket connection failed!\x1b[0m')
        } else {
          this.outputs[key] = '\x1b[31mWebsocket connection failed!\x1b[0m'
        }
      }
    }
  }

  componentWillUnmount() {
    this.socket.close();
    store.isFullscreen = false;
  }

  handleWrite = (key, data) => {
    if (this.terms[key]) {
      this.terms[key].write(data)
    } else if (this.outputs[key]) {
      this.outputs[key] += data
    } else {
      this.outputs[key] = data
    }
  }

  StatusExtra = (props) => (
    <div style={{display: 'flex', alignItems: 'center'}}>
      {props.status === -2 ? (
        <LoadingOutlined style={{fontSize: 22, color: '#108ee9'}}/>
      ) : (
        <>
          <pre className={styles.header2}>{this.lastOutputs[props.id]}</pre>
          {props.status === 0 ? (
            <CheckCircleTwoTone style={{fontSize: 22}} twoToneColor="#52c41a"/>
          ) : (
            <Tooltip title={`退出状态码：${props.status}`}>
              <WarningTwoTone style={{fontSize: 22}} twoToneColor="red"/>
            </Tooltip>
          )}
        </>
      )}
      <CodeOutlined style={{fontSize: 22, color: '#1890ff', marginLeft: 16}}
                    onClick={e => this.openTerminal(e, props.id)}/>
    </div>
  )

  handleUpdate = (data) => {
    this.setState(data, () => {
      const key = this.state.activeKey;
      if (key && this.terms[key]) setTimeout(this.terms[key].fit)
    })
  }

  openTerminal = (e, key) => {
    e.stopPropagation()
    window.open(`/ssh?id=${key}`)
  }

  render() {
    const {isFullscreen, activeKey} = this.state;
    return (
      <Modal
        visible
        width={isFullscreen ? '100%' : 1000}
        title={[
          <span key="1">执行控制台</span>,
          <div key="2" className={styles.fullscreen} onClick={() => this.handleUpdate({isFullscreen: !isFullscreen})}>
            {isFullscreen ? <FullscreenExitOutlined/> : <FullscreenOutlined/>}
          </div>
        ]}
        footer={null}
        onCancel={this.props.onCancel}
        onOk={this.handleSubmit}
        maskClosable={false}>
        <Collapse
          accordion
          className={styles.collapse}
          activeKey={activeKey}
          onChange={key => this.handleUpdate({activeKey: key})}>
          {Object.entries(store.outputs).map(([key, item], index) => (
            <Collapse.Panel
              key={key}
              header={<div className={styles.header1}>{item.title}</div>}
              extra={<this.StatusExtra status={item.status} id={key}/>}>
              <OutView
                isFullscreen={isFullscreen}
                getOutput={() => this.outputs[key]}
                setTerm={term => this.terms[key] = term}/>
            </Collapse.Panel>
          ))}
        </Collapse>
      </Modal>
    )
  }
}

export default ExecConsole
