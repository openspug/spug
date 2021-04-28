/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useEffect } from 'react';
import { observer } from 'mobx-react';
import { Table, Modal, Dropdown, Button, Menu, Avatar, Tooltip, Space, Tag, message } from 'antd';
import { PlusOutlined, DownOutlined } from '@ant-design/icons';
import { Action, TableCard, AuthButton, AuthFragment } from 'components';
import { http, hasPermission } from 'libs';
import store from './store';
import icons from './icons';

function ComTable() {
  useEffect(() => {
    store.fetchRecords()
  }, [])

  function handleDelete(text) {
    Modal.confirm({
      title: '删除确认',
      content: `确定要删除【${text['name']}】?`,
      onOk: () => {
        return http.delete('/api/host/', {params: {id: text.id}})
          .then(() => {
            message.success('删除成功');
            store.fetchRecords()
          })
      }
    })
  }

  function handleImport(menu) {
    if (menu.key === 'excel') {
      store.importVisible = true
    } else {
      store.cloudImport = menu.key
    }
  }

  function IpAddress(props) {
    if (props.ip && props.ip.length > 0) {
      return (
        <div>{props.ip[0]}<span style={{color: '#999'}}>（{props.isPublic ? '公' : '私有'}）</span></div>
      )
    } else {
      return null
    }
  }

  return (
    <TableCard
      rowKey="id"
      title={<TableCard.Search keys={['f_name/主机名称', 'f_host/连接地址']} onChange={(k, v) => store[k] = v}/>}
      loading={store.isFetching}
      dataSource={store.dataSource}
      onReload={store.fetchRecords}
      actions={[
        <AuthButton
          auth="host.host.add"
          type="primary"
          icon={<PlusOutlined/>}
          onClick={() => store.showForm()}>新建</AuthButton>,
        <AuthFragment auth="host.host.import">
          <Dropdown overlay={(
            <Menu onClick={handleImport}>
              <Menu.Item key="excel">
                <Space>
                  <Avatar shape="square" size={20} src={icons.excel}/>
                  <span>Excel</span>
                </Space>
              </Menu.Item>
              <Menu.Item key="ali">
                <Space>
                  <Avatar shape="square" size={20} src={icons.alibaba}/>
                  <span>阿里云</span>
                </Space>
              </Menu.Item>
              <Menu.Item key="tencent">
                <Space>
                  <Avatar shape="square" size={20} src={icons.tencent}/>
                  <span>腾讯云</span>
                </Space>
              </Menu.Item>
            </Menu>
          )}>
            <Button type="primary">批量导入 <DownOutlined/></Button>
          </Dropdown>
        </AuthFragment>
      ]}
      pagination={{
        showSizeChanger: true,
        showLessItems: true,
        hideOnSinglePage: true,
        showTotal: total => `共 ${total} 条`,
        pageSizeOptions: ['10', '20', '50', '100']
      }}>
      <Table.Column
        showSorterTooltip={false}
        title="主机名称"
        render={info => <Action.Button onClick={() => store.showDetail(info)}>{info.name}</Action.Button>}
        sorter={(a, b) => a.name.localeCompare(b.name)}/>
      <Table.Column title="IP地址" render={info => (
        <div>
          <IpAddress ip={info.public_ip_address} isPublic/>
          <IpAddress ip={info.private_ip_address}/>
        </div>
      )}/>
      <Table.Column title="配置信息" render={info => (
        <Space>
          <Tooltip title={info.os_name}>
            <Avatar shape="square" size={16} src={icons[info.os_type]}/>
          </Tooltip>
          <span>{info.cpu}核 {info.memory}GB</span>
        </Space>
      )}/>
      <Table.Column hide title="备注信息" dataIndex="desc"/>
      <Table.Column
        title="状态"
        dataIndex="is_verified"
        render={v => v ? <Tag color="green">已验证</Tag> : <Tag color="orange">未验证</Tag>}/>
      {hasPermission('host.host.edit|host.host.del|host.host.console') && (
        <Table.Column width={160} title="操作" render={info => (
          <Action>
            <Action.Button auth="host.host.edit" onClick={() => store.showForm(info)}>编辑</Action.Button>
            <Action.Button danger auth="host.host.del" onClick={() => handleDelete(info)}>删除</Action.Button>
          </Action>
        )}/>
      )}
    </TableCard>
  )
}

export default observer(ComTable)
