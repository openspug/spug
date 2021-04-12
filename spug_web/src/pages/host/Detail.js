import React from 'react';
import { observer } from 'mobx-react';
import { Drawer, Descriptions, List } from 'antd';
import store from './store';

export default observer(function () {
  const host = store.record;
  const group_ids = host.group_ids || [];
  return (
    <Drawer
      width={500}
      title={host.name}
      placement="right"
      onClose={() => store.detailVisible = false}
      visible={store.detailVisible}>
      <Descriptions bordered size="small" title={<span style={{fontWeight: 500}}>基本信息</span>} column={1}>
        <Descriptions.Item label="主机名称">{host.name}</Descriptions.Item>
        <Descriptions.Item label="连接地址">{host.username}@{host.hostname}</Descriptions.Item>
        <Descriptions.Item label="连接端口">{host.port}</Descriptions.Item>
        <Descriptions.Item label="独立密钥">{host.pkey ? '是' : '否'}</Descriptions.Item>
        <Descriptions.Item label="描述信息">{host.desc}</Descriptions.Item>
        <Descriptions.Item label="所属分组">
          <List>
            {group_ids.map(g_id => (
              <List.Item key={g_id} style={{padding: '6px 0'}}>{store.groups[g_id]}</List.Item>
            ))}
          </List>
        </Descriptions.Item>
      </Descriptions>
      {host.id ? (
        <Descriptions
          bordered
          size="small"
          column={1}
          style={{marginTop: 24}}
          title={<span style={{fontWeight: 500}}>扩展信息</span>}>
          <Descriptions.Item label="实例ID">{host.instance_id}</Descriptions.Item>
          <Descriptions.Item label="操作系统">{host.os_name}</Descriptions.Item>
          <Descriptions.Item label="CPU">{host.cpu}核</Descriptions.Item>
          <Descriptions.Item label="内存">{host.memory}GB</Descriptions.Item>
          <Descriptions.Item label="磁盘">{host.disk.map(x => `${x}GB`).join(', ')}</Descriptions.Item>
          <Descriptions.Item label="内网IP">{host.private_ip_address.join(', ')}</Descriptions.Item>
          <Descriptions.Item label="公网IP">{host.public_ip_address.join(', ')}</Descriptions.Item>
          <Descriptions.Item label="实例付费方式">{host.instance_charge_type_alias}</Descriptions.Item>
          <Descriptions.Item label="网络付费方式">{host.internet_charge_type_alisa}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{host.created_time}</Descriptions.Item>
          <Descriptions.Item label="到期时间">{host.expired_time || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="更新时间">{host.updated_at}</Descriptions.Item>
        </Descriptions>
      ) : null}

    </Drawer>
  )
})