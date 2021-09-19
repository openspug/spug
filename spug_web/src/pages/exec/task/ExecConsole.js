/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import {
  CaretRightOutlined,
  CheckCircleTwoTone,
  LoadingOutlined,
  WarningTwoTone,
  FullscreenOutlined,
  FullscreenExitOutlined
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
          if (data.replace(/\r\n/g, '')) this.lastOutputs[key] = data.trim()
          this.handleWrite(key, data)
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

  genExtra = (status, key) => {
    if (status === -2) {
      return <LoadingOutlined style={{fontSize: 20, color: '#108ee9'}}/>;
    } else if (status === 0) {
      return (
        <div style={{display: 'flex', alignItems: 'center'}}>
          <pre className={styles.header2}>{this.lastOutputs[key]}</pre>
          <CheckCircleTwoTone style={{fontSize: 20}} twoToneColor="#52c41a"/>
        </div>
      )
    } else {
      return (
        <div style={{display: 'flex', alignItems: 'center'}}>
          <pre className={styles.header2}>{this.lastOutputs[key]}</pre>
          <Tooltip title={`退出状态码：${status}`}>
            <WarningTwoTone style={{fontSize: 20}} twoToneColor="red"/>
          </Tooltip>
        </div>
      )
    }
  };

  handleUpdate = (data) => {
    this.setState(data, () => {
      const key = this.state.activeKey;
      if (key && this.terms[key]) setTimeout(this.terms[key].fit)
    })
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
          onChange={key => this.handleUpdate({activeKey: key})}
          expandIcon={({isActive}) => <CaretRightOutlined style={{fontSize: 16}} rotate={isActive ? 90 : 0}/>}>
          {Object.entries(store.outputs).map(([key, item], index) => (
            <Collapse.Panel
              key={key}
              header={<div className={styles.header1}>{item['title']}</div>}
              extra={this.genExtra(item.status, key)}>
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
