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
import { X_TOKEN } from 'libs';
import OutView from './OutView';
import styles from './index.module.css';
import store from './store';


@observer
class ExecConsole extends React.Component {
  constructor(props) {
    super(props);
    this.socket = null;
    this.elements = {};
    this.state = {
      data: {}
    }
  }

  componentDidMount() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.socket = new WebSocket(`${protocol}//${window.location.host}/api/ws/exec/${store.token}/?x-token=${X_TOKEN}`);
    this.socket.onopen = () => {
      this.socket.send('ok');
      for (let item of Object.values(store.outputs)) {
        item['system'].push('### Waiting for schedule\n')
      }
    };
    this.socket.onmessage = e => {
      if (e.data === 'pong') {
        this.socket.send('ping')
      } else {
        const {key, data, type, status} = JSON.parse(e.data);
        if (status !== undefined) {
          store.outputs[key]['status'] = status
        } else if (data) {
          store.outputs[key][type].push(data);
        }
      }
    }
  }

  componentWillUnmount() {
    this.socket.close();
    store.isFullscreen = false;
  }

  genExtra = (outputs) => {
    let latest, icon;
    if (outputs['status'] === -2) {
      return <LoadingOutlined style={{fontSize: 20, color: '#108ee9'}}/>;
    } else if (outputs['status'] === 0) {
      latest = outputs['info'][outputs['info'].length - 1];
      icon = <CheckCircleTwoTone style={{fontSize: 20}} twoToneColor="#52c41a"/>
    } else {
      latest = outputs['error'][outputs['error'].length - 1]
      icon = <Tooltip title={`退出状态码：${outputs['status']}`}>
        <WarningTwoTone style={{fontSize: 20}} twoToneColor="red"/>
      </Tooltip>
    }
    return (
      <div style={{display: 'flex', alignItems: 'center'}}>
        <pre className={styles.header}>{latest}</pre>
        {icon}
      </div>
    )
  };

  render() {
    return (
      <Modal
        visible
        width={store.isFullscreen ? '100%' : 1000}
        title={[
          <span key="1">执行控制台</span>,
          <div key="2" className={styles.fullscreen} onClick={() => store.isFullscreen = !store.isFullscreen}>
            {store.isFullscreen ? <FullscreenExitOutlined/> : <FullscreenOutlined/>}
          </div>
        ]}
        footer={null}
        onCancel={this.props.onCancel}
        onOk={this.handleSubmit}
        maskClosable={false}>
        <Collapse
          accordion
          defaultActiveKey={[0]}
          className={styles.collapse}
          expandIcon={({isActive}) => <CaretRightOutlined style={{fontSize: 16}} rotate={isActive ? 90 : 0}/>}>
          {Object.entries(store.outputs).map(([key, item], index) => (
            <Collapse.Panel
              key={index}
              header={<b>{item['title']}</b>}
              extra={this.genExtra(item)}>
              <OutView outputs={item}/>
            </Collapse.Panel>
          ))}
        </Collapse>
      </Modal>
    )
  }
}

export default ExecConsole
