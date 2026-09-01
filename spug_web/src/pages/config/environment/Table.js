/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useEffect } from 'react';
import { observer } from 'mobx-react';
import { Table, Modal, Divider, message } from 'antd';
import { PlusOutlined, UpSquareOutlined, DownSquareOutlined } from '@ant-design/icons';
import { Action, TableCard, AuthButton } from 'components';
import { http, hasPermission, t } from 'libs';
import store from './store';

function ComTable() {
  useEffect(() => {
    store.fetchRecords()
  }, [])

  function handleDelete(text) {
    Modal.confirm({
      title: t('删除确认'),
      content: t('确定要删除【{}】?', text['name']),
      onOk: () => {
        return http.delete('/api/config/environment/', {params: {id: text.id}})
          .then(() => {
            message.success(t('删除成功'));
            store.fetchRecords()
          })
      }
    })
  }

  function handleSort(info, sort) {
    store.fetching = true;
    http.patch('/api/config/environment/', {id: info.id, sort})
      .then(store.fetchRecords, () => store.fetching = false)
  }

  return (
    <TableCard
      tKey="ce"
      rowKey="id"
      title={t('环境列表')}
      loading={store.isFetching}
      dataSource={store.dataSource}
      onReload={store.fetchRecords}
      actions={[
        <AuthButton
          auth="config.env.add"
          type="primary"
          icon={<PlusOutlined/>}
          onClick={() => store.showForm()}>{t('新建')}</AuthButton>
      ]}
      pagination={{
        showSizeChanger: true,
        showLessItems: true,
        showTotal: total => t('共 {} 条', total),
        pageSizeOptions: ['10', '20', '50', '100']
      }}>
      <Table.Column width={120} title={t('排序')} key="series" render={(info) => (
        <div>
          <UpSquareOutlined
            onClick={() => handleSort(info, 'up')}
            style={{cursor: 'pointer', color: '#6c7cff'}}/>
          <Divider type="vertical"/>
          <DownSquareOutlined
            onClick={() => handleSort(info, 'down')}
            style={{cursor: 'pointer', color: '#6c7cff'}}/>
        </div>
      )}/>
      <Table.Column title={t('环境名称')} dataIndex="name"/>
      <Table.Column title={t('标识符')} dataIndex="key"/>
      <Table.Column ellipsis title={t('备注信息')} dataIndex="desc"/>
      {hasPermission('config.env.edit|config.env.del') && (
        <Table.Column title={t('操作')} render={info => (
          <Action>
            <Action.Button auth="config.env.edit" onClick={() => store.showForm(info)}>{t('编辑')}</Action.Button>
            <Action.Button danger auth="config.env.del" onClick={() => handleDelete(info)}>{t('删除')}</Action.Button>
          </Action>
        )}/>
      )}
    </TableCard>
  )
}

export default observer(ComTable)
