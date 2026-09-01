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

function ComTable() {
  function handleDelete(text) {
    Modal.confirm({
      title: t('删除确认'),
      content: t('确定要删除【{}】?', text['name']),
      onOk: () => http.delete('/api/ai/model/', {params: {id: text.id}})
        .then(() => {
          message.success(t('删除成功'));
          store.fetchRecords()
        })
    })
  }

  function handleActive(record, is_active) {
    http.patch('/api/ai/model/', {id: record.id, is_active})
      .then(() => store.fetchRecords())
  }

  function handleDefault(record) {
    if (record.is_default) return;
    Modal.confirm({
      title: t('切换主模型'),
      content: t('确定将【{}】设为主模型？原主模型将自动变为备选。', record.name),
      onOk: () => http.patch('/api/ai/model/', {id: record.id, is_default: true})
        .then(() => {
          message.success(t('操作成功'));
          store.fetchRecords()
        })
    })
  }

  return (
    <TableCard
      tKey="cm"
      rowKey="id"
      title={t('模型配置')}
      loading={store.isFetching}
      dataSource={store.dataSource}
      onReload={store.fetchRecords}
      actions={[
        <AuthButton auth="config.model.add" type="primary" icon={<PlusOutlined/>}
                    onClick={() => store.showForm()}>{t('新建')}</AuthButton>
      ]}
      pagination={{
        showSizeChanger: true,
        showLessItems: true,
        hideOnSinglePage: true,
        showTotal: total => t('共 {} 条', total),
        pageSizeOptions: ['10', '20', '50', '100']
      }}>
      <Table.Column title={t('配置名称')} dataIndex="name"/>
      <Table.Column title={t('模型名称')} dataIndex="model"/>
      <Table.Column ellipsis title={t('接口地址')} dataIndex="base_url"/>
      <Table.Column title={t('角色')} render={info => info.is_default
        ? <Tag color="blue">{t('主模型')}</Tag>
        : <Tag>{t('备选')} {info.sort_id}</Tag>}/>
      <Table.Column title={t('状态')} render={info => (
        <Switch
          checked={info.is_active}
          disabled={!hasPermission('config.model.edit')}
          onChange={v => handleActive(info, v)}/>
      )}/>
      <Table.Column hide title={t('备注信息')} dataIndex="desc"/>
      {hasPermission('config.model.edit|config.model.del') && (
        <Table.Column width={220} title={t('操作')} render={info => (
          <Action>
            <Action.Button auth="config.model.edit"
                           disabled={info.is_default}
                           onClick={() => handleDefault(info)}>{t('设为主模型')}</Action.Button>
            <Action.Button auth="config.model.edit" onClick={() => store.showForm(info)}>{t('编辑')}</Action.Button>
            <Action.Button danger auth="config.model.del" onClick={() => handleDelete(info)}>{t('删除')}</Action.Button>
          </Action>
        )}/>
      )}
    </TableCard>
  )
}

export default observer(ComTable)
