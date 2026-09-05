/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { observer } from 'mobx-react';
import { Table, Modal, Dropdown, Button, Avatar, Tooltip, Space, Tag, Radio, Input, message } from 'antd';
import { PlusOutlined, DownOutlined, SyncOutlined, FormOutlined, ExportOutlined } from '@ant-design/icons';
import { Action, TableCard, AuthButton, AuthFragment } from 'components';
import IPAddress from './IPAddress';
import Metrics from './Metrics';
import { http, hasPermission, blobToExcel, humanDate, t } from 'libs';
import store from './store';
import icons from './icons';
import moment from 'moment';

function ComTable() {
  const [loading, setLoading] = useState(false)

  function handleDelete(text) {
    Modal.confirm({
      title: t('删除确认'),
      content: t('确定要删除【{}】?', text['name']),
      onOk: () => {
        return http.delete('/api/host/', {params: {id: text.id}})
          .then(() => {
            message.success(t('删除成功'));
            store.fetchRecords()
          })
      }
    })
  }

  function handleImport(menu) {
    if (menu.key === 'excel') {
      store.importVisible = true
    } else if (menu.key === 'form') {
      store.showForm({group_ids: [store.group.value]})
    } else {
      store.cloudImport = menu.key
    }
  }

  function handleExport() {
    setLoading(true)
    http.post('/api/host/export/', {ids: store.dataSource.map(x => x.id)}, {responseType: 'blob', timeout: 60000})
      .then(res => blobToExcel(res.data, `${humanDate()}_${t('主机列表')}.xlsx`))
      .finally(() => setLoading(false))
  }

  function ExpTime(props) {
    if (!props.value) return null
    let value = moment(props.value)
    const days = value.diff(moment(), 'days')
    if (days > 30) {
      return <span>{t('剩余')} <b style={{color: '#389e0d'}}>{days}</b> {t('天')}</span>
    } else if (days > 7) {
      return <span>{t('剩余')} <b style={{color: '#faad14'}}>{days}</b> {t('天')}</span>
    } else if (days >= 0) {
      return <span>{t('剩余')} <b style={{color: '#d9363e'}}>{days}</b> {t('天')}</span>
    } else {
      return <span>{t('过期')} <b style={{color: '#d9363e'}}>{Math.abs(days)}</b> {t('天')}</span>
    }
  }

  return (
    <TableCard
      tKey="hi"
      rowKey="id"
      title={<Input allowClear value={store.f_word} placeholder={t('输入名称/IP检索')} style={{maxWidth: 250}}
                    onChange={e => store.f_word = e.target.value}/>}
      loading={store.isFetching}
      dataSource={store.dataSource}
      onReload={store.fetchRecords}
      actions={[
        <AuthFragment auth="host.host.add">
          <Dropdown menu={{
            onClick: handleImport,
            items: [
              {
                key: 'form',
                label: (
                  <Space>
                    <FormOutlined style={{fontSize: 16, marginRight: 4, color: '#6c7cff'}}/>
                    <span>{t('新建主机')}</span>
                  </Space>
                )
              },
              {
                key: 'excel',
                label: (
                  <Space>
                    <Avatar shape="square" size={20} src={icons.excel}/>
                    <span>Excel</span>
                  </Space>
                )
              },
              {
                key: 'ali',
                label: (
                  <Space>
                    <Avatar shape="square" size={20} src={icons.alibaba}/>
                    <span>{t('阿里云')}</span>
                  </Space>
                )
              },
              {
                key: 'tencent',
                label: (
                  <Space>
                    <Avatar shape="square" size={20} src={icons.tencent}/>
                    <span>{t('腾讯云')}</span>
                  </Space>
                )
              }
            ]
          }}>
            <Button type="primary" icon={<PlusOutlined/>}>{t('新建')} <DownOutlined/></Button>
          </Dropdown>
        </AuthFragment>,
        <AuthButton
          auth="host.host.view"
          type="primary"
          loading={loading}
          icon={<ExportOutlined/>}
          onClick={handleExport}>{t('导出')}</AuthButton>,
        <AuthButton
          auth="host.host.add"
          type="primary"
          icon={<SyncOutlined/>}
          onClick={() => store.showSync()}>{t('验证')}</AuthButton>,
        <Radio.Group value={store.f_status} onChange={e => store.f_status = e.target.value}>
          <Radio.Button value="">{t('全部')}</Radio.Button>
          <Radio.Button value={false}>{t('未验证')}</Radio.Button>
        </Radio.Group>
      ]}
      pagination={{
        showSizeChanger: true,
        showLessItems: true,
        hideOnSinglePage: true,
        showTotal: total => t('共 {} 条', total),
        pageSizeOptions: ['10', '20', '50', '100']
      }}>
      <Table.Column
        showSorterTooltip={false}
        title={t('主机名称')}
        render={info => <Action.Button onClick={() => store.showDetail(info)}>{info.name}</Action.Button>}
        sorter={(a, b) => a.name.localeCompare(b.name)}/>
      <Table.Column title={t('IP地址')} render={info => (
        <div>
          <IPAddress ip={info.public_ip_address} isPublic/>
          <IPAddress ip={info.private_ip_address}/>
        </div>
      )}/>
      <Table.Column title={t('监控')} render={info => (
        info.is_verified ? <Metrics id={info.id}/> : null
      )}/>
      <Table.Column title={t('配置信息')} render={info => (
        <Space>
          <Tooltip title={info.os_name}>
            <Avatar shape="square" size={16} src={icons[info.os_type]}/>
          </Tooltip>
          <span>{t('{}核 {}GB', info.cpu, info.memory)}</span>
        </Space>
      )}/>
      <Table.Column hide title={t('到期信息')} dataIndex="expired_time" render={v => <ExpTime value={v}/>}/>
      <Table.Column hide title={t('备注信息')} dataIndex="desc"/>
      <Table.Column
        title={t('状态')}
        dataIndex="is_verified"
        render={v => v ? <Tag color="green">{t('已验证')}</Tag> : <Tag color="orange">{t('未验证')}</Tag>}/>
      {hasPermission('host.host.edit|host.host.del|host.host.console') && (
        <Table.Column width={160} title={t('操作')} render={info => (
          <Action>
            <Action.Button auth="host.host.edit" onClick={() => store.showForm(info)}>{t('编辑')}</Action.Button>
            <Action.Button danger auth="host.host.del" onClick={() => handleDelete(info)}>{t('删除')}</Action.Button>
          </Action>
        )}/>
      )}
    </TableCard>
  )
}

export default observer(ComTable)
