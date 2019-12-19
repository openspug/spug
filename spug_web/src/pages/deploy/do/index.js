import React from 'react';
import { Steps, Collapse, Icon } from 'antd';
import http from 'libs/http';
import styles from './index.module.css';
import store from './store';


class Index extends React.Component {
  componentDidMount() {
    const {id} = this.props.match.params;
    http.post(`/api/deploy/request/${id}/`)
      .then(token => {
        this.socket = new WebSocket(`ws://localhost:8000/ws/exec/${token}/`);
        this.socket.onopen = () => {
          this.socket.send('ok');
        };
        this.socket.onmessage = e => {
          if (e.data === 'pong') {
            this.socket.send('ping')
          } else {
            console.log(JSON.parse(e.data));
          //   const {key, data, type, status} = JSON.parse(e.data);
          //   if (status !== undefined) {
          //     store.outputs[key]['status'] = status
          //   } else if (data) {
          //     store.outputs[key][type] += data;
          //     store.outputs[key]['latest'] = data;
          //     if (this.elements[key]) {
          //       this.elements[key].scrollIntoView({behavior: 'smooth'})
          //     }
          //   }
          }
        }
      })
  }

  componentWillUnmount() {
    if (this.socket) this.socket.close()
  }

  render() {
    return (
      <div>
        <div style={{fontSize: 16, marginBottom: 10}}>服务端执行 :</div>
        <Collapse defaultActiveKey={1}>
          <Collapse.Panel showArrow={false} key={1} header={
            <Steps style={{maxWidth: 800}}>
              <Steps.Step status="finish" title="检出前任务"/>
              <Steps.Step status="finish" title="执行检出"/>
              <Steps.Step status="finish" title="检出后任务" icon={<Icon type="loading"/>}/>
            </Steps>
          }>web -01</Collapse.Panel>
        </Collapse>
        <div style={{fontSize: 16, margin: '30px 0 10px 0'}}>目标主机执行 :</div>
        <Collapse>
          <Collapse.Panel key={1} header={
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <div>web-01</div>
              <Steps size="small" style={{maxWidth: 500}}>
                <Steps.Step status="finish" title="发布前任务"/>
                <Steps.Step status="finish" title="执行发布"/>
                <Steps.Step status="finish" title="发布后任务" icon={<Icon type="loading"/>}/>
              </Steps>
            </div>
          }>web -01</Collapse.Panel>
          <Collapse.Panel key={2} header="web-02">web -02</Collapse.Panel>
        </Collapse>
      </div>
    )
  }
}

export default Index