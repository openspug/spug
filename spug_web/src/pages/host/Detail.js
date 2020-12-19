import React from 'react';
import { observer } from 'mobx-react';
import { Drawer, Descriptions, List } from 'antd';
import store from './store';

export default observer(function () {
  const host = store.record;
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
            <List.Item>腾讯云/华北区</List.Item>
            <List.Item>腾讯云/测试环境/电商商城系统</List.Item>
            <List.Item>腾讯云/测试环境/订单后台系统</List.Item>
          </List>
        </Descriptions.Item>
      </Descriptions>
    </Drawer>
  )
})