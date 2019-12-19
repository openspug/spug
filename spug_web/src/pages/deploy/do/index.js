import React from 'react';
import { observer } from 'mobx-react';
import { Steps, Collapse, Icon } from 'antd';
import http from 'libs/http';
import styles from './index.module.css';
import store from './store';
import lds from 'lodash';

@observer
class Index extends React.Component {
  componentDidMount() {
    const {id} = this.props.match.params;
    http.post(`/api/deploy/request/${id}/`)
      .then(({token, outputs, targets}) => {
        store.outputs = outputs;
        store.targets = targets;
        this.socket = new WebSocket(`ws://localhost:8000/ws/exec/${token}/`);
        this.socket.onopen = () => {
          this.socket.send('ok');
        };
        this.socket.onmessage = e => {
          if (e.data === 'pong') {
            this.socket.send('ping')
          } else {
            const {key, data, step, status} = JSON.parse(e.data);
            if (data !== undefined) store.outputs[key]['data'] += data;
            if (step !== undefined) store.outputs[key]['step'] = step;
            if (status !== undefined) store.outputs[key]['status'] = status;
            // if (this.elements[key]) {
            //   this.elements[key].scrollIntoView({behavior: 'smooth'})
            // }
          }
        }
      })
  }

  componentWillUnmount() {
    if (this.socket) this.socket.close()
  }

  getStatus = (key, n) => {
    const step = lds.get(store.outputs, `${key}.step`, 0);
    const isError = lds.get(store.outputs, `${key}.status`) === 'error';
    const icon = <Icon type="loading"/>;
    if (n > step) {
      return {key: n, status: 'wait'}
    } else if (n === step) {
      return isError ? {key: n, status: 'error'} : {key: n, status: 'process', icon}
    } else {
      return {key: n, status: 'finish'}
    }
  };

  render() {
    return (
      <div>
        <div style={{fontSize: 16, marginBottom: 10}}>服务端执行 :</div>
        <Collapse defaultActiveKey={1} className={styles.collapse}>
          <Collapse.Panel showArrow={false} key={1} header={
            <Steps>
              <Steps.Step {...this.getStatus('local', 0)} title="建立连接"/>
              <Steps.Step {...this.getStatus('local', 1)} title="发布准备"/>
              <Steps.Step {...this.getStatus('local', 2)} title="检出前任务"/>
              <Steps.Step {...this.getStatus('local', 3)} title="执行检出"/>
              <Steps.Step {...this.getStatus('local', 4)} title="检出后任务"/>
            </Steps>}>
            <pre className={styles.console}>{lds.get(store.outputs, 'local.data')}</pre>
          </Collapse.Panel>
        </Collapse>
        <div style={{fontSize: 16, margin: '30px 0 10px 0'}}>目标主机执行 :</div>
        <Collapse
          defaultActiveKey={'0'}
          className={styles.collapse}
          expandIcon={({isActive}) => <Icon type="caret-right" style={{fontSize: 16}} rotate={isActive ? 90 : 0}/>}>
          {store.targets.map((item, index) => (
            <Collapse.Panel key={index} header={
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <b>{item.title}</b>
                <Steps size="small" style={{maxWidth: 600}}>
                  <Steps.Step {...this.getStatus(item.id, 1)} title="数据准备"/>
                  <Steps.Step {...this.getStatus(item.id, 2)} title="发布前任务"/>
                  <Steps.Step {...this.getStatus(item.id, 3)} title="执行发布"/>
                  <Steps.Step {...this.getStatus(item.id, 4)} title="发布后任务"/>
                </Steps>
              </div>}>
              <pre className={styles.console}>{lds.get(store.outputs, `${item.id}.data`)}</pre>
            </Collapse.Panel>
          ))}
        </Collapse>
      </div>
    )
  }
}

export default Index