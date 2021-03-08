import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { Drawer, Descriptions, Table } from 'antd';
import { http } from 'libs';
import store from './store';
import styles from './index.module.less';

export default observer(function (props) {
  const [fetching, setFetching] = useState(true);
  const [order, setOrder] = useState({});

  useEffect(() => {
    if (store.record.id && props.visible) {

    }
  }, [props.visible])

  const columns = [{
    title: '应用名称',
    key: 'name',
  }, {
    title: '商品主图',
    dataIndex: 'pic',
  }, {
    title: '单价',
    dataIndex: 'price',
    align: 'right',
  }, {
    title: '数量',
    key: 'number',
    align: 'right',
  }, {
    title: '金额',
    key: 'money',
    align: 'right',
  }]

  const record = store.record;
  const [extra1, extra2, extra3] = record.extra || [];
  return (
    <Drawer width={550} visible={props.visible} onClose={() => store.detailVisible = false}>
      <Descriptions column={1} title={<span style={{fontSize: 22}}>基本信息</span>}>
        <Descriptions.Item label="应用">{record.app_name}</Descriptions.Item>
        <Descriptions.Item label="环境">{record.env_name}</Descriptions.Item>
        <Descriptions.Item label="版本">{record.version}</Descriptions.Item>
        {extra1 === 'branch' ? ([
          <Descriptions.Item key="1" label="Git分支">{extra2}</Descriptions.Item>,
          <Descriptions.Item key="2" label="CommitID">{extra3}</Descriptions.Item>,
        ]) : (
          <Descriptions.Item label="Git标签">{extra2}</Descriptions.Item>
        )}
        <Descriptions.Item label="内部版本">{record.spug_version}</Descriptions.Item>
        <Descriptions.Item label="构建时间">{record.created_at}</Descriptions.Item>
        <Descriptions.Item label="备注信息">{record.remarks}</Descriptions.Item>
        <Descriptions.Item label="构建人">{record.created_by_user}</Descriptions.Item>
      </Descriptions>
      <Descriptions title={<span style={{fontSize: 22}}>发布记录</span>} style={{marginTop: 24}}/>
      <Table rowKey="id" loading={fetching} columns={columns} dataSource={[]} pagination={false}/>
    </Drawer>
  )
})