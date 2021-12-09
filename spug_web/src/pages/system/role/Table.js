/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Modal, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { TableCard, AuthButton, Action } from 'components';
import http from 'libs/http';
import store from './store';

@observer
class ComTable extends React.Component {
  componentDidMount() {
    store.fetchRecords()
  }

  columns = [{
    title: '角色名称',
    dataIndex: 'name',
  }, {
    title: '关联账户',
    dataIndex: 'used',
  }, {
    title: '描述信息',
    dataIndex: 'desc',
    ellipsis: true
  }, {
    title: '操作',
    width: 400,
    render: info => (
      <Action>
        <Action.Button onClick={() => store.showForm(info)}>编辑</Action.Button>
        <Action.Button onClick={() => store.showPagePerm(info)}>功能权限</Action.Button>
        <Action.Button onClick={() => store.showDeployPerm(info)}>发布权限</Action.Button>
        <Action.Button onClick={() => store.showHostPerm(info)}>主机权限</Action.Button>
        <Action.Button danger onClick={() => this.handleDelete(info)}>删除</Action.Button>
      </Action>
    )
  }];

  handleDelete = (text) => {
    Modal.confirm({
      title: '删除确认',
      content: `确定要删除角色【${text['name']}】?`,
      onOk: () => {
        return http.delete('/api/account/role/', {params: {id: text.id}})
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
        rowKey="sr"
        title="角色列表"
        loading={store.isFetching}
        dataSource={store.dataSource}
        onReload={store.fetchRecords}
        actions={[
          <AuthButton type="primary" icon={<PlusOutlined/>} onClick={() => store.showForm()}>新建</AuthButton>
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
