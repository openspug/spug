/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Badge, Table } from 'antd';
import uStore from '../account/store';


export default observer(function (props) {
  const users = uStore.records.filter(x => x.role_ids.includes(props.id))
  return (
    <Table rowKey="id" dataSource={users} pagination={false} scroll={{y: 500}}>
      <Table.Column width={120} title="姓名" dataIndex="nickname"/>
      <Table.Column width={90} title="状态" dataIndex="is_active"
                    render={v => v ? <Badge status="success" text="正常"/> : <Badge status="default" text="禁用"/>}/>
      <Table.Column width={180} title="最近登录" dataIndex="last_login"/>
    </Table>
  )
})