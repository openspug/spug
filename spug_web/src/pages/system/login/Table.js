/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Radio, Tag } from 'antd';
import { TableCard } from 'components';
import store from './store';

@observer
class ComTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      password: ''
    }
  }

  componentDidMount() {
    store.fetchRecords()
  }

  columns = [{
    title: '时间',
    width: 200,
    dataIndex: 'created_at'
  }, {
    title: '账户名',
    width: 120,
    dataIndex: 'username',
  }, {
    title: '登录方式',
    width: 100,
    hide: true,
    dataIndex: 'type',
    render: text => text === 'ldap' ? 'LDAP' : '普通登录'
  }, {
    title: '状态',
    width: 90,
    render: text => text['is_success'] ? <Tag color="success">成功</Tag> : <Tag color="error">失败</Tag>
  }, {
    title: '登录IP',
    width: 160,
    dataIndex: 'ip',
  }, {
    title: 'User Agent',
    ellipsis: true,
    dataIndex: 'agent'
  }, {
    title: '提示信息',
    ellipsis: true,
    dataIndex: 'message'
  }];

  render() {
    return (
      <TableCard
        tKey="sl"
        rowKey="id"
        title="登录记录"
        loading={store.isFetching}
        dataSource={store.dataSource}
        onReload={store.fetchRecords}
        actions={[
          <Radio.Group value={store.f_status} onChange={e => store.f_status = e.target.value}>
            <Radio.Button value="">全部</Radio.Button>
            <Radio.Button value="true">成功</Radio.Button>
            <Radio.Button value="false">失败</Radio.Button>
          </Radio.Group>
        ]}
        pagination={{
          showSizeChanger: true,
          showLessItems: true,
          showTotal: total => `共 ${total} 条`,
          pageSizeOptions: ['10', '20', '50', '100']
        }}
        columns={this.columns}/>
    )
  }
}

export default ComTable
