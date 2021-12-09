/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Table, Modal, Radio, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Action, AuthButton, TableCard } from 'components';
import { http, hasPermission } from 'libs';
import store from './store';

@observer
class ComTable extends React.Component {
  componentDidMount() {
    store.fetchRecords();
  }

  handleActive = (text) => {
    Modal.confirm({
      title: '操作确认',
      content: `确定要${text['is_active'] ? '禁用' : '启用'}【${text['name']}】?`,
      onOk: () => {
        return http.patch(`/api/monitor/`, {id: text.id, is_active: !text['is_active']})
          .then(() => {
            message.success('操作成功');
            store.fetchRecords()
          })
      }
    })
  };

  handleDelete = (text) => {
    Modal.confirm({
      title: '删除确认',
      content: `确定要删除【${text['name']}】?`,
      onOk: () => {
        return http.delete('/api/monitor/', {params: {id: text.id}})
          .then(() => {
            message.success('删除成功');
            store.fetchRecords()
          })
      }
    })
  };

  render() {
    return (
      <TableCard
        tKey="mi"
        rowKey="id"
        title="监控任务"
        loading={store.isFetching}
        dataSource={store.dataSource}
        onReload={store.fetchRecords}
        actions={[
          <AuthButton
            auth="monitor.monitor.add"
            type="primary"
            icon={<PlusOutlined/>}
            onClick={() => store.showForm()}>新建</AuthButton>,
          <Radio.Group value={store.f_active} onChange={e => store.f_active = e.target.value}>
            <Radio.Button value="">全部</Radio.Button>
            <Radio.Button value="1">已激活</Radio.Button>
            <Radio.Button value="0">未激活</Radio.Button>
          </Radio.Group>
        ]}
        pagination={{
          showSizeChanger: true,
          showLessItems: true,
          showTotal: total => `共 ${total} 条`,
          pageSizeOptions: ['10', '20', '50', '100']
        }}>
        <Table.Column title="监控分组" dataIndex="group"/>
        <Table.Column title="监控名称" dataIndex="name"/>
        <Table.Column title="类型" dataIndex="type_alias"/>
        <Table.Column title="频率" dataIndex="rate" render={value => `${value}分钟`}/>
        <Table.Column title="状态" render={info => {
          if (info.is_active) {
            return <Tag color="blue">已激活</Tag>
          } else {
            return <Tag color="red">未激活</Tag>
          }
        }}/>
        <Table.Column title="更新于" dataIndex="latest_run_time_alias"
                      sorter={(a, b) => a.latest_run_time.localeCompare(b.latest_run_time)}/>
        <Table.Column hide title="描述" dataIndex="desc"/>
        {hasPermission('monitor.monitor.edit|monitor.monitor.del') && (
          <Table.Column width={180} title="操作" render={info => (
            <Action>
              <Action.Button auth="monitor.monitor.edit"
                             onClick={() => this.handleActive(info)}>{info['is_active'] ? '禁用' : '启用'}</Action.Button>
              <Action.Button auth="monitor.monitor.edit" onClick={() => store.showForm(info)}>编辑</Action.Button>
              <Action.Button danger auth="monitor.monitor.del"
                             onClick={() => this.handleDelete(info)}>删除</Action.Button>
            </Action>
          )}/>
        )}
      </TableCard>
    )
  }
}

export default ComTable
