/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Table, Modal, Tag, Switch, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Action, TableCard, AuthButton } from 'components';
import { http, hasPermission, t } from 'libs';
import store from './store';

function McpTable() {
  function handleDelete(text) {
    Modal.confirm({
      title: t('删除确认'),
      content: t('确定要删除【{}】?', text['name']),
      onOk: () => http.delete('/api/ai/mcp/', {params: {id: text.id}})
        .then(() => {
          message.success(t('删除成功'));
          store.fetchMcpRecords()
        })
    })
  }

  function handleActive(record, is_active) {
    http.patch('/api/ai/mcp/', {id: record.id, is_active})
      .then(() => store.fetchMcpRecords())
  }

  return (
    <TableCard
      tKey="am"
      rowKey="id"
      title={t('MCP服务')}
      loading={store.mcpFetching}
      dataSource={store.mcpDataSource}
      onReload={store.fetchMcpRecords}
      actions={[
        <AuthButton auth="ai.mcp.add" type="primary" icon={<PlusOutlined/>}
                    onClick={() => store.showMcpForm()}>{t('新建')}</AuthButton>
      ]}
      pagination={{
        showSizeChanger: true,
        showLessItems: true,
        hideOnSinglePage: true,
        showTotal: total => t('共 {} 条', total),
        pageSizeOptions: ['10', '20', '50', '100']
      }}>
      <Table.Column title={t('服务名称')} dataIndex="name"/>
      <Table.Column title={t('部署类型')} dataIndex="type" render={v => v === 'docker'
        ? <Tag color="blue">Docker</Tag>
        : <Tag color="green">HTTP</Tag>}/>
      <Table.Column ellipsis title={t('目标')} render={info => info.type === 'docker' ? info.image : info.url}/>
      <Table.Column title={t('工具数')} render={info => (info.tools || []).length}/>
      <Table.Column title={t('状态')} render={info => (
        <Switch
          checked={info.is_active}
          disabled={!hasPermission('ai.mcp.edit')}
          onChange={v => handleActive(info, v)}/>
      )}/>
      <Table.Column hide title={t('备注信息')} dataIndex="desc"/>
      {hasPermission('ai.mcp.edit|ai.mcp.del') && (
        <Table.Column width={160} title={t('操作')} render={info => (
          <Action>
            <Action.Button auth="ai.mcp.edit" onClick={() => store.showMcpForm(info)}>{t('编辑')}</Action.Button>
            <Action.Button danger auth="ai.mcp.del" onClick={() => handleDelete(info)}>{t('删除')}</Action.Button>
          </Action>
        )}/>
      )}
    </TableCard>
  )
}

export default observer(McpTable)
