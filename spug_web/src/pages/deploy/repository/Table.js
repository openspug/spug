/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { observer } from 'mobx-react';
import { Table, Modal, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Action, TableCard, AuthButton } from 'components';
import { http, hasPermission } from 'libs';
import store from './store';

function ComTable() {
  const [loading, setLoading] = useState();

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

  function handleRebuild(info) {
    if (info.status === '5') {
      Modal.confirm({
        title: '重新构建提示',
        content: `当前选择版本 ${info.version} 已完成构建，再次构建将覆盖已有的数据，要再次重新构建吗？`,
        onOk: () => _rebuild(info)
      })
    } else if (info.status === '1') {
      return message.error('已在构建中，请点击日志查看详情')
    } else {
      _rebuild(info)
    }
  }

  function _rebuild(info) {
    setLoading(info.id);
    http.patch('/api/repository/', {id: info.id, action: 'rebuild'})
      .then(() => store.showConsole(info))
      .finally(() => setLoading(null))
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
      <Table.Column width={100} title="状态"
                    render={info => <Tag color={statusColorMap[info.status]}>{info.status_alias}</Tag>}/>
      {hasPermission('config.env.edit|config.env.del') && (
        <Table.Column width={180} title="操作" render={info => (
          <Action>
            <Action.Button auth="config.env.edit" onClick={() => store.showDetail(info)}>详情</Action.Button>
            <Action.Button
              auth="config.env.del"
              loading={loading === info.id}
              onClick={() => handleRebuild(info)}>构建</Action.Button>
            <Action.Button auth="config.env.del" onClick={() => store.showConsole(info)}>日志</Action.Button>
          </Action>
        )}/>
      )}
    </TableCard>
  )
}

export default observer(ComTable)
