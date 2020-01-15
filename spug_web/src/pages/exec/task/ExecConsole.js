/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Modal, Collapse, Icon } from 'antd';
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
    this.socket = new WebSocket(`${protocol}//${window.location.host}/api/ws/exec/${store.token}/`);
    this.socket.onopen = () => {
      this.socket.send('ok');
      for (let item of Object.values(store.outputs)) {
        item['system'] += '### Waiting for schedule\n'
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
          store.outputs[key][type] += data;
          store.outputs[key]['latest'] = data;
          if (this.elements[key]) {
            this.elements[key].scrollIntoView({behavior: 'smooth'})
          }
        }
      }
    }
  }

  componentWillUnmount() {
    this.socket.close()
  }

  genExtra = (key) => {
    const item = store.outputs[key];
    return (
      <div style={{display: 'flex', alignItems: 'center'}}>
        <pre className={styles.header}>{item['latest']}</pre>
        {item['status'] === -2 ? <Icon type="loading" style={{fontSize: 20, color: '#108ee9'}}/> :
          item['status'] === 0 ?
            <Icon type="check-circle" style={{fontSize: 20}} theme="twoTone" twoToneColor="#52c41a"/> :
            <Icon type="warning" style={{fontSize: 20}} theme="twoTone" twoToneColor="red"/>}
      </div>
    )
  };

  render() {
    return (
      <Modal
        visible
        width={800}
        title="执行控制台"
        footer={null}
        onCancel={this.props.onCancel}
        onOk={this.handleSubmit}
        maskClosable={false}>
        <Collapse
          accordion
          defaultActiveKey={[0]}
          className={styles.collapse}
          expandIcon={({isActive}) => <Icon type="caret-right" style={{fontSize: 16}} rotate={isActive ? 90 : 0}/>}>
          {Object.entries(store.outputs).map(([key, item], index) => (
            <Collapse.Panel
              key={index}
              header={<b>{item['title']}</b>}
              extra={this.genExtra(key)}>
              <pre className={styles.console}>
                <pre style={{color: '#91d5ff'}}>{item['system']}</pre>
                {item['info']}
                <pre ref={ref => this.elements[key] = ref} style={{color: '#ffa39e'}}>{item['error']}</pre>
              </pre>
            </Collapse.Panel>
          ))}
        </Collapse>
      </Modal>
    )
  }
}

export default ExecConsole
