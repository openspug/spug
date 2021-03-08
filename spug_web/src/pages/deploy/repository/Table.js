/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Table, Modal, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Action, TableCard, AuthButton } from 'components';
import { http, hasPermission } from 'libs';
import store from './store';

function ComTable() {
  function handleDelete(info) {
    Modal.confirm({
      title: '删除确认',
      content: `确定要删除【${info['name']}】?`,
      onOk: () => {
        return http.delete('/api/config/environment/', {params: {id: info.id}})
          .then(() => {
            message.success('删除成功');
            store.fetchRecords()
          })
      }
    })
  }

  const statusColorMap = {'0': 'cyan', '1': 'blue', '2': 'red', '5': 'green'};
  return (
    <TableCard
      rowKey="id"
      title="构建版本列表"
      loading={store.isFetching}
      dataSource={store.dataSource}
      onReload={store.fetchRecords}
      actions={[
        <AuthButton
          auth="config.env.add"
          type="primary"
          icon={<PlusOutlined/>}
          onClick={() => store.addVisible = true}>新建</AuthButton>
      ]}
      pagination={{
        showSizeChanger: true,
        showLessItems: true,
        hideOnSinglePage: true,
        showTotal: total => `共 ${total} 条`,
        pageSizeOptions: ['10', '20', '50', '100']
      }}>
      <Table.Column ellipsis title="应用" dataIndex="app_name"/>
      <Table.Column title="环境" dataIndex="env_name"/>
      <Table.Column title="版本" dataIndex="version"/>
      <Table.Column ellipsis title="备注" dataIndex="remarks"/>
      <Table.Column hide title="构建时间" dataIndex="created_at"/>
      <Table.Column hide title="构建人" dataIndex="created_by_user"/>
      <Table.Column width={100} title="状态" render={info => <Tag color={statusColorMap[info.status]}>{info.status_alias}</Tag>}/>
      {hasPermission('config.env.edit|config.env.del') && (
        <Table.Column width={150} title="操作" render={info => (
          <Action>
            <Action.Button auth="config.env.edit" onClick={() => store.showDetail(info)}>详情</Action.Button>
            <Action.Button auth="config.env.del" onClick={() => store.showConsole(info)}>日志</Action.Button>
          </Action>
        )}/>
      )}
    </TableCard>
  )
}

export default observer(ComTable)
