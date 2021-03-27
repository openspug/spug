/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Table, Modal, message } from 'antd';
import { PlusOutlined, ImportOutlined } from '@ant-design/icons';
import { Action, TableCard, AuthButton } from 'components';
import { http, hasPermission } from 'libs';
import store from './store';

@observer
class ComTable extends React.Component {
  componentDidMount() {
    store.fetchRecords()
  }

  handleConsole = (info) => {
    window.open(`/ssh/${info.id}`)
  };

  handleDelete = (text) => {
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
  };

  render() {
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
          <AuthButton
            auth="host.host.add"
            type="primary"
            icon={<ImportOutlined/>}
            onClick={() => store.importVisible = true}>批量导入</AuthButton>
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
        <Table.Column title="连接地址" dataIndex="hostname" sorter={(a, b) => a.name.localeCompare(b.name)}/>
        <Table.Column hide width={100} title="端口" dataIndex="port"/>
        <Table.Column title="备注信息" dataIndex="desc"/>
        {hasPermission('host.host.edit|host.host.del|host.host.console') && (
          <Table.Column width={200} title="操作" render={info => (
            <Action>
              <Action.Button auth="host.host.edit" onClick={() => store.showForm(info)}>编辑</Action.Button>
              <Action.Button auth="host.host.del" onClick={() => this.handleDelete(info)}>删除</Action.Button>
              <Action.Button auth="host.host.console" onClick={() => this.handleConsole(info)}>Console</Action.Button>
            </Action>
          )}/>
        )}
      </TableCard>
    )
  }
}

export default ComTable
