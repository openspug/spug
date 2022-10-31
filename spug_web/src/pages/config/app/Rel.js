/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Transfer, message, Tabs } from 'antd';
import { http, hasPermission } from 'libs';
import serviceStore from '../service/store';
import store from './store';

@observer
class Rel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      services: [],
      apps: store.records.filter(x => x.id !== store.record.id).map(x => ({...x, key: x.id, _key: x.key}))
    }
  }

  componentDidMount() {
    if (serviceStore.records.length === 0) {
      serviceStore.fetchRecords().then(this._updateRecords)
    } else {
      this._updateRecords()
    }
  }

  _updateRecords = () => {
    const services = serviceStore.records.map(x => {
      return {...x, key: x.id, _key: x.key}
    });
    this.setState({services})
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
        width={700}
        maskClosable={false}
        title="配置服务依赖"
        onCancel={() => store.relVisible = false}
        confirmLoading={this.state.loading}
        footer={hasPermission('config.app.edit_config') ? undefined : null}
        onOk={this.handleSubmit}>
        <Tabs tabPosition="left">
          <Tabs.TabPane tab="应用依赖" key="app">
            <Form.Item extra="设置依赖后，该应用将能够获取到所依赖应用的配置。">
              <Transfer
                listStyle={{width: 280, minHeight: 300}}
                titles={['所有应用', '已选应用']}
                dataSource={this.state.apps}
                targetKeys={store.confRel.app}
                onChange={keys => store.confRel.app = keys}
                render={item => `${item.name}(${item._key})`}/>
            </Form.Item>
          </Tabs.TabPane>
          <Tabs.TabPane tab="服务依赖" key="service">
            <Form.Item extra="设置依赖后，该应用将能够获取到所依赖服务的配置。">
              <Transfer
                listStyle={{width: 280, minHeight: 300}}
                titles={['所有服务', '已选服务']}
                dataSource={this.state.services}
                targetKeys={store.confRel.service}
                onChange={keys => store.confRel.service = keys}
                render={item => `${item.name}(${item._key})`}/>
            </Form.Item>
          </Tabs.TabPane>
        </Tabs>
      </Modal>
    )
  }
}

export default Rel
