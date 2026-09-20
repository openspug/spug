/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Drawer, Table, Tag, Popconfirm, message } from 'antd';
import { Action } from 'components';
import { http, hasPermission, t } from 'libs';
import S, { STATUS_COLORS } from './store';

function Record() {
  function handleView(info) {
    // 抽屉由 showHistoryConsole 在确认有内容可回放后再关
    return S.showHistoryConsole(info)
  }

  function handleDelete(info) {
    return http.delete(`/api/pipeline/history/${info.id}/`)
      .then(() => {
        message.success(t('删除成功'));
        S.fetchHistories(S.record.id)
      })
  }

  return (
    <Drawer
      destroyOnClose
      width={920}
      placement="right"
      open={S.historyVisible}
      title={t('执行记录 - {}', S.record.name)}
      onClose={() => S.historyVisible = false}>
      <Table
        rowKey="id"
        loading={S.historyFetching}
        dataSource={S.histories}
        locale={{emptyText: t('暂无执行记录')}}
        pagination={{
          showSizeChanger: true,
          showLessItems: true,
          hideOnSinglePage: true,
          showTotal: total => t('共 {} 条', total),
          pageSizeOptions: ['10', '20', '50', '100']
        }}>
        <Table.Column width={80} title={t('序号')} render={info => `#${info.ordinal}`}/>
        <Table.Column width={100} title={t('状态')}
                      render={info => <Tag color={STATUS_COLORS[info.status]}>{info.status_alias}</Tag>}/>
        <Table.Column width={110} title={t('触发方式')} dataIndex="trigger_alias"/>
        <Table.Column width={120} ellipsis title={t('执行人')} dataIndex="created_by"/>
        <Table.Column width={170} title={t('开始时间')} dataIndex="created_at"/>
        <Table.Column width={100} title={t('耗时')} render={info => info.duration_alias || '-'}/>
        <Table.Column width={120} title={t('操作')} render={info => (
          <Action>
            <Action.Button onClick={() => handleView(info)}>{t('查看')}</Action.Button>
            {hasPermission('pipeline.pipeline.del') && (
              <Popconfirm title={t('确定要删除该执行记录？')} onConfirm={() => handleDelete(info)}>
                <Action.Button danger>{t('删除')}</Action.Button>
              </Popconfirm>
            )}
          </Action>
        )}/>
      </Table>
    </Drawer>
  )
}

export default observer(Record)
