/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Transfer, message, Tabs, Alert } from 'antd';
import http from 'libs/http';
import envStore from 'pages/config/environment/store';
import appStore from 'pages/config/app/store';
import store from './store';
import lds from 'lodash';

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
    const envs = lds.get(store.deployRel, 'envs', [])
    const apps = lds.get(store.deployRel, 'apps', [])
    if (!(envs.length === 0 && apps.length === 0)) {
      if (envs.length === 0) return message.error('请至少设置一个环境权限')
      if (apps.length === 0) return message.error('请至少设置一个应用权限')
    }
    this.setState({loading: true});
    http.patch('/api/account/role/', {id: store.record.id, deploy_perms: {envs, apps}})
      .then(res => {
        message.success('操作成功');
        store.deployPermVisible = false;
        store.fetchRecords()
      }, () => this.setState({loading: false}))
  };

  handleFilter = (inputValue, option) => {
    const keywords = inputValue.toLowerCase();
    return `${option.name} - ${option._key}`.toLowerCase().includes(keywords)
  }

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
        <Alert
          closable
          showIcon
          type="info"
          style={{margin: '0 24px 24px 24px'}}
          message="环境权限和应用权限都需要设置，应用的创建者将默认拥有该应用的发布权限。"/>
        <Tabs tabPosition="left">
          <Tabs.TabPane tab="环境权限" key="env">
            <Form.Item label="设置可发布至哪个环境">
              <Transfer
                showSearch
                listStyle={{width: 280, minHeight: 300}}
                titles={['所有环境', '已选环境']}
                dataSource={this.state.envs}
                targetKeys={store.deployRel.envs}
                filterOption={this.handleFilter}
                onChange={keys => store.deployRel.envs = keys}
                render={item => `${item.name} - ${item._key}`}/>
            </Form.Item>
          </Tabs.TabPane>
          <Tabs.TabPane tab="应用权限" key="app">
            <Form.Item label="设置可发布的应用">
              <Transfer
                showSearch
                listStyle={{width: 280, minHeight: 300}}
                titles={['所有应用', '已选应用']}
                dataSource={this.state.apps}
                targetKeys={store.deployRel.apps}
                filterOption={this.handleFilter}
                onChange={keys => store.deployRel.apps = keys}
                render={item => `${item.name} - ${item._key}`}/>
            </Form.Item>
          </Tabs.TabPane>
        </Tabs>
      </Modal>
    )
  }
}

export default DeployPerm
