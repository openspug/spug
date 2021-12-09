/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { ExclamationCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Form, Radio, Modal, Button, Badge, message, Input } from 'antd';
import { TableCard, Action } from 'components';
import http from 'libs/http';
import store from './store';

@observer
class ComTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      password: ''
    }
  }

  componentDidMount() {
    store.fetchRecords()
  }

  columns = [{
    title: '登录名',
    dataIndex: 'username',
  }, {
    title: '姓名',
    dataIndex: 'nickname',
  }, {
    title: '状态',
    render: text => text['is_active'] ? <Badge status="success" text="正常"/> : <Badge status="default" text="禁用"/>
  }, {
    title: '最近登录',
    dataIndex: 'last_login'
  }, {
    title: '操作',
    render: info => (
      <Action>
        <Action.Button onClick={() => this.handleActive(info)}>{info['is_active'] ? '禁用' : '启用'}</Action.Button>
        <Action.Button onClick={() => store.showForm(info)}>编辑</Action.Button>
        <Action.Button disabled={info['type'] === 'ldap'} onClick={() => this.handleReset(info)}>重置密码</Action.Button>
        <Action.Button danger onClick={() => this.handleDelete(info)}>删除</Action.Button>
      </Action>
    )
  }];

  handleActive = (text) => {
    Modal.confirm({
      title: '操作确认',
      content: `确定要${text['is_active'] ? '禁用' : '启用'}【${text['nickname']}】?`,
      onOk: () => {
        return http.patch(`/api/account/user/`, {id: text.id, is_active: !text['is_active']})
          .then(() => {
            message.success('操作成功');
            store.fetchRecords()
          })
      }
    })
  };

  handleReset = (info) => {
    Modal.confirm({
      icon: <ExclamationCircleOutlined/>,
      title: '重置登录密码',
      content: <Form layout="vertical" style={{marginTop: 24}}>
        <Form.Item required label="重置后的新密码">
          <Input.Password onChange={val => this.setState({password: val.target.value})}/>
        </Form.Item>
      </Form>,
      onOk: () => {
        return http.patch('/api/account/user/', {id: info.id, password: this.state.password})
          .then(() => message.success('重置成功', 0.5))
      },
    })
  };

  handleDelete = (text) => {
    Modal.confirm({
      title: '删除确认',
      content: `确定要删除【${text['nickname']}】?`,
      onOk: () => {
        return http.delete('/api/account/user/', {params: {id: text.id}})
          .then(() => {
            message.success('删除成功');
            store.fetchRecords()
          })
      }
    })
  };

  render() {
    return (
      <TableCard
        tKey="sa"
        rowKey="id"
        title="账户列表"
        loading={store.isFetching}
        dataSource={store.dataSource}
        onReload={store.fetchRecords}
        actions={[
          <Button type="primary" icon={<PlusOutlined/>} onClick={() => store.showForm()}>新建</Button>,
          <Radio.Group value={store.f_status} onChange={e => store.f_status = e.target.value}>
            <Radio.Button value="">全部</Radio.Button>
            <Radio.Button value="true">正常</Radio.Button>
            <Radio.Button value="false">禁用</Radio.Button>
          </Radio.Group>
        ]}
        pagination={{
          showSizeChanger: true,
          showLessItems: true,
          showTotal: total => `共 ${total} 条`,
          pageSizeOptions: ['10', '20', '50', '100']
        }}
        columns={this.columns}/>
    )
  }
}

export default ComTable
