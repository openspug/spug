/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Steps, Collapse, PageHeader, Spin, Tag, Button, Icon } from 'antd';
import http from 'libs/http';
import { AuthDiv } from 'components';
import history from 'libs/history';
import styles from './index.module.css';
import store from './store';
import lds from 'lodash';

@observer
class Ext1Index extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      fetching: true,
      loading: false,
      request: {},
    }
  }

  componentDidMount() {
    this.id = this.props.match.params.id;
    http.get(`/api/deploy/request/${this.id}/`)
      .then(res => store.request = res)
      .finally(() => this.setState({fetching: false}))
  }

  componentWillUnmount() {
    if (this.socket) this.socket.close();
    store.request = {targets: [], server_actions: [], host_actions: []};
    store.outputs = {};
  }

  handleDeploy = () => {
    this.setState({loading: true});
    http.post(`/api/deploy/request/${this.id}/`)
      .then(({token, outputs}) => {
        store.request.status = '2';
        store.outputs = outputs;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.socket = new WebSocket(`${protocol}//${window.location.host}/api/ws/exec/${token}/`);
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
          }
        }
      })
      .finally(() => this.setState({loading: false}))
  };

  getStatus = (key, n) => {
    const step = lds.get(store.outputs, `${key}.step`, -1);
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

  getStatusAlias = () => {
    if (Object.keys(store.outputs).length !== 0) {
      for (let item of [{id: 'local'}, ...store.request.targets]) {
        if (lds.get(store.outputs, `${item.id}.status`) === 'error') {
          return <Tag color="red">发布异常</Tag>
        } else if (lds.get(store.outputs, `${item.id}.step`, -1) < 100) {
          return <Tag color="blue">发布中</Tag>
        }
      }
      return <Tag color="green">发布成功</Tag>
    } else {
      return <Tag>{store.request['status_alias'] || '...'}</Tag>
    }
  };

  render() {
    const {app_name, env_name, status, server_actions, host_actions} = store.request;
    return (
      <AuthDiv auth="deploy.request.do">
        <Spin spinning={this.state.fetching}>
          <PageHeader
            title="应用发布"
            subTitle={`${app_name} - ${env_name}`}
            style={{padding: 0}}
            tags={this.getStatusAlias()}
            extra={<Button loading={this.state.loading} type="primary" disabled={!['1', '-3'].includes(status)}
                           onClick={this.handleDeploy}>发布</Button>}
            onBack={() => history.goBack()}/>
          <Collapse defaultActiveKey={1} className={styles.collapse}>
            <Collapse.Panel showArrow={false} key={1} header={
              <Steps style={{maxWidth: 400 + server_actions.length * 200}}>
                <Steps.Step {...this.getStatus('local', 0)} title="建立连接"/>
                <Steps.Step {...this.getStatus('local', 1)} title="发布准备"/>
                {server_actions.map((item, index) => (
                  <Steps.Step {...this.getStatus('local', 2 + index)} key={index} title={item.title}/>
                ))}
              </Steps>}>
              <pre className={styles.ext1Console}>{lds.get(store.outputs, 'local.data')}</pre>
            </Collapse.Panel>
          </Collapse>

          {host_actions.length > 0 && (
            <Collapse
              defaultActiveKey={'0'}
              className={styles.collapse}
              expandIcon={({isActive}) => <Icon type="caret-right" style={{fontSize: 16}} rotate={isActive ? 90 : 0}/>}>
              {store.request.targets.map((item, index) => (
                <Collapse.Panel key={index} header={
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <b>{item.title}</b>
                    <Steps size="small" style={{maxWidth: 150 + host_actions.length * 150}}>
                      <Steps.Step {...this.getStatus(item.id, 1)} title="数据准备"/>
                      {host_actions.map((action, index) => (
                        <Steps.Step {...this.getStatus(item.id, 2 + index)} key={index} title={action.title}/>
                      ))}
                    </Steps>
                  </div>}>
                  <pre className={styles.ext1Console}>{lds.get(store.outputs, `${item.id}.data`)}</pre>
                </Collapse.Panel>
              ))}
            </Collapse>
          )}
          {host_actions.length === 0 && this.state.fetching === false && (
            <div className={styles.ext2Tips}>无目标主机动作</div>
          )}
        </Spin>
      </AuthDiv>
    )
  }
}

export default Ext1Index
