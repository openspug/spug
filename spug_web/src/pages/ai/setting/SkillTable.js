/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Table, Modal, Switch, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Action, TableCard, AuthButton } from 'components';
import { http, hasPermission, t } from 'libs';
import store from './store';

function SkillTable() {
  function handleDelete(text) {
    Modal.confirm({
      title: t('删除确认'),
      content: t('确定要删除【{}】?', text['name']),
      onOk: () => http.delete('/api/ai/skill/', {params: {id: text.id}})
        .then(() => {
          message.success(t('删除成功'));
          store.fetchSkillRecords()
        })
    })
  }

  function handleActive(record, is_active) {
    http.patch('/api/ai/skill/', {id: record.id, is_active})
      .then(() => store.fetchSkillRecords())
  }

  return (
    <TableCard
      tKey="as"
      rowKey="id"
      title={t('技能')}
      loading={store.skillFetching}
      dataSource={store.skillDataSource}
      onReload={store.fetchSkillRecords}
      actions={[
        <AuthButton auth="ai.skill.add" type="primary" icon={<PlusOutlined/>}
                    onClick={() => store.showSkillForm()}>{t('新建')}</AuthButton>
      ]}
      pagination={{
        showSizeChanger: true,
        showLessItems: true,
        hideOnSinglePage: true,
        showTotal: total => t('共 {} 条', total),
        pageSizeOptions: ['10', '20', '50', '100']
      }}>
      <Table.Column title={t('技能名称')} dataIndex="name"/>
      <Table.Column ellipsis title={t('用途说明')} dataIndex="description"/>
      <Table.Column title={t('内容长度')} render={info => `${(info.content || '').length}`}/>
      <Table.Column title={t('状态')} render={info => (
        <Switch
          checked={info.is_active}
          disabled={!hasPermission('ai.skill.edit')}
          onChange={v => handleActive(info, v)}/>
      )}/>
      {hasPermission('ai.skill.edit|ai.skill.del') && (
        <Table.Column width={160} title={t('操作')} render={info => (
          <Action>
            <Action.Button auth="ai.skill.edit" onClick={() => store.showSkillForm(info)}>{t('编辑')}</Action.Button>
            <Action.Button danger auth="ai.skill.del" onClick={() => handleDelete(info)}>{t('删除')}</Action.Button>
          </Action>
        )}/>
      )}
    </TableCard>
  )
}

export default observer(SkillTable)
