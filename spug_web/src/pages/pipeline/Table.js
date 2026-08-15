/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useEffect } from 'react';
import { observer } from 'mobx-react';
import { Table, Modal, Popconfirm, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Action, TableCard, AuthButton } from 'components';
import { http, hasPermission, history, t } from 'libs';
import S from './store';

function ComTable() {
  useEffect(() => {
    S.fetchRecords()
  }, [])

  function handleDelete(text) {
    Modal.confirm({
      title: t('删除确认'),
      content: t('确定要删除【{}】?', text['name']),
      onOk: () => {
        return http.delete('/api/pipeline/', {params: {id: text.id}})
          .then(() => {
            message.success(t('删除成功'));
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
      title={t('流程列表')}
      loading={S.isFetching}
      dataSource={S.dataSource}
      onReload={S.fetchRecords}
      actions={[
        <AuthButton
          auth="pipeline.pipeline.add"
          type="primary"
          icon={<PlusOutlined/>}
          onClick={() => toDetail()}>{t('新建')}</AuthButton>
      ]}
      pagination={{
        showSizeChanger: true,
        showLessItems: true,
        showTotal: total => t('共 {} 条', total),
        pageSizeOptions: ['10', '20', '50', '100']
      }}>
      <Table.Column title={t('流程名称')} dataIndex="name"/>
      <Table.Column ellipsis title={t('备注信息')} dataIndex="desc"/>
      {hasPermission('pipeline.pipeline.edit|pipeline.pipeline.del|pipeline.pipeline.do') && (
        <Table.Column width={210} title={t('操作')} render={info => (
          <Action>
            <Action.Button auth="pipeline.pipeline.edit" onClick={() => toDetail(info)}>{t('编辑')}</Action.Button>
            <Popconfirm title={t('确定要执行吗？')} onConfirm={() => S.showConsole(info)}>
              <Action.Button auth="pipeline.pipeline.do">{t('执行')}</Action.Button>
            </Popconfirm>
            <Action.Button danger auth="pipeline.pipeline.del" onClick={() => handleDelete(info)}>{t('删除')}</Action.Button>
          </Action>
        )}/>
      )}
    </TableCard>
  )
}

export default observer(ComTable)
