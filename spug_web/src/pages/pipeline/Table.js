/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useEffect } from 'react';
import { observer } from 'mobx-react';
import { Table, Modal, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Action, TableCard, AuthButton } from 'components';
import { http, hasPermission, history } from 'libs';
import S from './store';

function ComTable() {
  useEffect(() => {
    S.fetchRecords()
  }, [])

  function handleDelete(text) {
    Modal.confirm({
      title: '删除确认',
      content: `确定要删除【${text['name']}】?`,
      onOk: () => {
        return http.delete('/api/pipeline/', {params: {id: text.id}})
          .then(() => {
            message.success('删除成功');
            S.fetchRecords()
          })
      }
    })
  }

  function toDetail(info) {
    history.push(`/pipeline/${info ? info.id : 'new'}`)
  }

  return (
    <TableCard
      tKey="pipe"
      rowKey="id"
      title="流程列表"
      loading={S.isFetching}
      dataSource={S.dataSource}
      onReload={S.fetchRecords}
      actions={[
        <AuthButton
          auth="pipeline.pipeline.add"
          type="primary"
          icon={<PlusOutlined/>}
          onClick={() => toDetail()}>新建</AuthButton>
      ]}
      pagination={{
        showSizeChanger: true,
        showLessItems: true,
        showTotal: total => `共 ${total} 条`,
        pageSizeOptions: ['10', '20', '50', '100']
      }}>
      <Table.Column title="流程名称" dataIndex="name"/>
      <Table.Column ellipsis title="备注信息" dataIndex="desc"/>
      {hasPermission('pipeline.pipeline.edit|pipeline.pipeline.del') && (
        <Table.Column width={210} title="操作" render={info => (
          <Action>
            <Action.Button auth="config.app.edit" onClick={() => toDetail(info)}>编辑</Action.Button>
            <Action.Button auth="config.app.edit" onClick={() => S.showConsole(info)}>执行</Action.Button>
            <Action.Button danger auth="config.app.del" onClick={() => handleDelete(info)}>删除</Action.Button>
          </Action>
        )}/>
      )}
    </TableCard>
  )
}

export default observer(ComTable)
