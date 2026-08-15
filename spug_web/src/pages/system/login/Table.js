/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Radio, Tag } from 'antd';
import { TableCard } from 'components';
import { t } from 'libs';
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
    title: t('登录时间'),
    width: 200,
    dataIndex: 'created_at'
  }, {
    title: t('账户名称'),
    width: 120,
    dataIndex: 'username',
  }, {
    title: t('登录方式'),
    width: 100,
    hide: true,
    dataIndex: 'type',
    render: text => text === 'ldap' ? 'LDAP' : t('普通登录')
  }, {
    title: t('状态'),
    width: 90,
    render: text => text['is_success'] ? <Tag color="success">{t('成功')}</Tag> : <Tag color="error">{t('失败')}</Tag>
  }, {
    title: t('登录IP'),
    width: 160,
    dataIndex: 'ip',
  }, {
    title: 'User Agent',
    ellipsis: true,
    dataIndex: 'agent'
  }, {
    title: t('提示信息'),
    ellipsis: true,
    dataIndex: 'message'
  }];

  render() {
    return (
      <TableCard
        tKey="sl"
        rowKey="id"
        title={t('登录记录')}
        loading={store.isFetching}
        dataSource={store.dataSource}
        onReload={store.fetchRecords}
        actions={[
          <Radio.Group value={store.f_status} onChange={e => store.f_status = e.target.value}>
            <Radio.Button value="">{t('全部')}</Radio.Button>
            <Radio.Button value="true">{t('成功')}</Radio.Button>
            <Radio.Button value="false">{t('失败')}</Radio.Button>
          </Radio.Group>
        ]}
        pagination={{
          showSizeChanger: true,
          showLessItems: true,
          showTotal: total => t('共 {} 条', total),
          pageSizeOptions: ['10', '20', '50', '100']
        }}
        columns={this.columns}/>
    )
  }
}

export default ComTable
