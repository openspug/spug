import React from 'react';
import {observer} from 'mobx-react';
import {Modal, Form, Transfer, message, Tabs, Alert} from 'antd';
import http from 'libs/http';
import envStore from 'pages/config/environment/store';
import appStore from 'pages/config/app/store';
import store from './store';

@observer
class DeployPerm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      envs: [],
      apps: []
    }
  }

  componentDidMount() {
    if (envStore.records.length === 0) {
      envStore.fetchRecords().then(
        () => this._updateRecords(envStore.records, 'envs')
      )
    } else {
      this._updateRecords(envStore.records, 'envs')
    }
    if (appStore.records.length === 0) {
      appStore.fetchRecords().then(
        () => this._updateRecords(appStore.records, 'apps')
      )
    } else {
      this._updateRecords(appStore.records, 'apps')
    }
  }

  _updateRecords = (records, key) => {
    const data = records.map(x => {
      return {...x, key: x.id, _key: x.key}
    });
    this.setState({[key]: data})
  };

  handleSubmit = () => {
    this.setState({loading: true});
    const {app, service} = store.confRel;
    http.patch('/api/app/', {id: store.record.id, rel_apps: app, rel_services: service})
      .then(res => {
        message.success('操作成功');
        store.relVisible = false;
        store.fetchRecords()
      }, () => this.setState({loading: false}))
  };

  render() {
    return (
      <Modal
        visible
        width={800}
        maskClosable={false}
        title="发布权限设置"
        onCancel={() => store.deployPermVisible = false}
        confirmLoading={this.state.loading}
        onOk={this.handleSubmit}>
        <Alert closable style={{width: 600, margin: '0 auto 20px', color: '#31708f !important'}} type="info"
                 message="小提示: 发布权限仅影响可发布的对象，页面公共权限请在功能权限中设置。"/>
        <Tabs tabPosition="left">
          <Tabs.TabPane tab="环境权限" key="env">
            <Form.Item label="设置可发布至哪个环境">
              <Transfer
                listStyle={{width: 280, minHeight: 300}}
                titles={['所有环境', '已选环境']}
                dataSource={this.state.envs}
                targetKeys={store.deployRel.envs}
                onChange={keys => store.deployRel.envs = keys}
                render={item => `${item.name}(${item._key})`}/>
            </Form.Item>
          </Tabs.TabPane>
          <Tabs.TabPane tab="应用权限" key="app">
            <Form.Item label="设置可发布的应用">
              <Transfer
                listStyle={{width: 280, minHeight: 300}}
                titles={['所有应用', '已选应用']}
                dataSource={this.state.apps}
                targetKeys={store.deployRel.apps}
                onChange={keys => store.deployRel.apps = keys}
                render={item => `${item.name}(${item._key})`}/>
            </Form.Item>
          </Tabs.TabPane>
        </Tabs>
      </Modal>
    )
  }
}

export default DeployPerm