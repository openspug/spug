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
import { http, hasPermission, t } from 'libs';
import store from './store';

function ComTable() {
  const [loading, setLoading] = useState();

  function handleRebuild(info) {
    if (info.status === '5') {
      Modal.confirm({
        title: t('重新构建提示'),
        content: t('当前选择版本 {} 已完成构建，再次构建将覆盖已有的数据，要再次重新构建吗？', info.version),
        onOk: () => _rebuild(info)
      })
    } else if (info.status === '1') {
      return message.error(t('已在构建中，请点击日志查看详情'))
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

  function expandedRowRender(record) {
    return (
      <Table rowKey="id" dataSource={record.child} pagination={false}>
        <Table.Column title={t('版本')} render={info => (
          <div style={{color: '#6c7cff', cursor: 'pointer'}} onClick={() => store.showDetail(info)}>{info.version}</div>
        )}/>
        <Table.Column title={t('环境')} dataIndex="env_name"/>
        <Table.Column title={t('构建时间')} dataIndex="created_at"/>
        <Table.Column title={t('备注')} dataIndex="remarks"/>
        <Table.Column title={t('状态')} render={info => <Tag color={statusColorMap[info.status]}>{info.status_alias}</Tag>}/>
        {hasPermission('deploy.repository.detail|deploy.repository.build|deploy.repository.log') && (
          <Table.Column width={180} title={t('操作')} render={info => (
            <Action>
              <Action.Button
                auth="deploy.repository.build"
                loading={loading === info.id}
                disabled={info.remarks === 'SPUG AUTO MAKE'}
                onClick={() => handleRebuild(info)}>{t('构建')}</Action.Button>
              <Action.Button auth="deploy.repository.build" onClick={() => store.showConsole(info)}>{t('日志')}</Action.Button>
            </Action>
          )}/>
        )}
      </Table>
    )
  }

  const statusColorMap = {'0': 'cyan', '1': 'blue', '2': 'red', '5': 'green'};
  return (
    <TableCard
      tKey="dre"
      rowKey="id"
      title={t('构建版本列表')}
      loading={store.isFetching}
      dataSource={store.dataSource}
      onReload={store.fetchRecords}
      actions={[
        <AuthButton
          auth="deploy.repository.add"
          type="primary"
          icon={<PlusOutlined/>}
          onClick={store.showForm}>{t('新建')}</AuthButton>
      ]}
      expandable={{expandedRowRender, expandRowByClick: true}}
      pagination={{
        showSizeChanger: true,
        showLessItems: true,
        showTotal: total => t('共 {} 条', total),
        pageSizeOptions: ['10', '20', '50', '100']
      }}>
      <Table.Column title={t('应用')} dataIndex="app_name"/>
      <Table.Column title={t('最新版本')} render={info => `${info.version}（${info.env_name}）`}/>
      <Table.Column title={t('构建时间')} dataIndex="created_at"/>
      <Table.Column title={t('构建人')} dataIndex="created_by_user"/>
      <Table.Column width={100} title={t('状态')}
                    render={info => <Tag color={statusColorMap[info.status]}>{info.status_alias}</Tag>}/>

    </TableCard>
  )
}

export default observer(ComTable)
