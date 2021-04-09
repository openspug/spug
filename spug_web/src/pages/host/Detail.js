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
          <List >
            {group_ids.map(g_id => (
              <List.Item key={g_id} style={{padding: '6px 0'}}>{store.groups[g_id]}</List.Item>
            ))}
          </List>
        </Descriptions.Item>
      </Descriptions>
    </Drawer>
  )
})