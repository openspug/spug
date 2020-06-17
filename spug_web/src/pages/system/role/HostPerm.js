/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Transfer, message, Alert } from 'antd';
import http from 'libs/http';
import hostStore from 'pages/host/store';
import store from './store';

@observer
class HostPerm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      hosts: [],
      apps: []
    }
  }

  componentDidMount() {
    if (hostStore.records.length === 0) {
      hostStore.fetchRecords().then(
        () => this._updateRecords(hostStore.records)
      )
    } else {
      this._updateRecords(hostStore.records)
    }
  }

  _updateRecords = (records) => {
    const hosts = records.map(x => {
      return {...x, key: x.id}
    });
    this.setState({hosts})
  };

  handleSubmit = () => {
    this.setState({loading: true});
    http.patch('/api/account/role/', {id: store.record.id, host_perms: store.hostPerms})
      .then(res => {
        message.success('操作成功');
        store.hostPermVisible = false;
        store.fetchRecords()
      }, () => this.setState({loading: false}))
  };

  render() {
    return (
      <Modal
        visible
        width={800}
        maskClosable={false}
        title="主机权限设置"
        onCancel={() => store.hostPermVisible = false}
        confirmLoading={this.state.loading}
        onOk={this.handleSubmit}>
        <Alert
          closable
          showIcon
          type="info"
          message="小提示"
          style={{width: 600, margin: '0 auto 20px', color: '#31708f !important'}}
          description="主机权限将全局影响属于该角色的用户能够看到的主机。"/>
        <Form.Item label="设置可访问的主机" style={{padding: '0 20px'}}>
          <Transfer
            showSearch
            listStyle={{width: 325, maxHeight: 500, minHeight: 300}}
            titles={['所有主机', '已选主机']}
            dataSource={this.state.hosts}
            targetKeys={store.hostPerms}
            onChange={keys => store.hostPerms = keys}
            filterOption={(inputValue, option) => `${option.zone}${option.name}`.toLowerCase().indexOf(inputValue.toLowerCase()) > -1}
            render={item => `${item.zone} - ${item.name}(${item.hostname})`}/>
        </Form.Item>
      </Modal>
    )
  }
}

export default HostPerm
