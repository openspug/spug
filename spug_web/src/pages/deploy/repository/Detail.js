import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { Drawer, Descriptions, Table, Button } from 'antd';
import { AuthDiv } from 'components';
import { http } from 'libs';
import store from './store';

export default observer(function (props) {
  const [fetching, setFetching] = useState(true);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (store.record.id && props.visible) {
      http.get('/api/repository/request/', {params: {repository_id: store.record.id}})
        .then(res => setRequests(res))
        .finally(() => setFetching(false))
    }
  }, [props.visible])

  function handleDelete() {
    setLoading(true);
    http.delete('/api/repository/', {params: {id: store.record.id}})
      .then(() => {
        store.fetchRecords();
        store.detailVisible = false
      })
      .finally(() => setLoading(false))
  }

  const record = store.record;
  const [extra1, extra2, extra3] = record.extra || [];
  return (
    <Drawer
      width={600}
      visible={props.visible}
      onClose={() => store.detailVisible = false}
      footer={(
        <AuthDiv
          auth="deploy.repository.del"
          style={{display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end'}}>
          <span style={{color: '#999', fontSize: 12}}>Tips: 已关联发布申请的构建版本无法删除（删除发布申请时将同步删除该记录）。</span>
          <Button danger loading={loading} disabled={requests.length > 0} onClick={handleDelete}>删除</Button>
        </AuthDiv>
      )}>
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
      <Table rowKey="id" loading={fetching} dataSource={requests} pagination={false}>
        <Table.Column title="发布申请" dataIndex="name"/>
        <Table.Column title="主机数量" dataIndex="host_ids" render={v => `${v.length}台`}/>
        <Table.Column title="状态" dataIndex="status_alias"/>
        <Table.Column title="申请时间" dataIndex="created_at"/>
      </Table>
    </Drawer>
  )
})