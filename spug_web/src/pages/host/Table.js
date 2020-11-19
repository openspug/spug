/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Table, Modal, message } from 'antd';
import { Action } from 'components';
import ComForm from './Form';
import ComImport from './Import';
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
    let data = store.permRecords;
    if (store.f_name) {
      data = data.filter(item => item['name'].toLowerCase().includes(store.f_name.toLowerCase()))
    }
    if (store.f_zone) {
      data = data.filter(item => item['zone'].toLowerCase().includes(store.f_zone.toLowerCase()))
    }
    if (store.f_host) {
      data = data.filter(item => item['hostname'].toLowerCase().includes(store.f_host.toLowerCase()))
    }
    return (
      <React.Fragment>
        <Table
          rowKey="id"
          loading={store.isFetching}
          dataSource={data}
          pagination={{
            showSizeChanger: true,
            showLessItems: true,
            hideOnSinglePage: true,
            showTotal: total => `共 ${total} 条`,
            pageSizeOptions: ['10', '20', '50', '100']
          }}>
          <Table.Column title="类别" dataIndex="zone"/>
          <Table.Column title="主机名称" dataIndex="name" sorter={(a, b) => a.name.localeCompare(b.name)}/>
          <Table.Column title="连接地址" dataIndex="hostname" sorter={(a, b) => a.name.localeCompare(b.name)}/>
          <Table.Column width={100} title="端口" dataIndex="port"/>
          <Table.Column ellipsis title="备注信息" dataIndex="desc"/>
          {hasPermission('host.host.edit|host.host.del|host.host.console') && (
            <Table.Column width={200} title="操作" render={info => (
              <Action>
                <Action.Button auth="host.host.edit" onClick={() => store.showForm(info)}>编辑</Action.Button>
                <Action.Button auth="host.host.del" onClick={() => this.handleDelete(info)}>删除</Action.Button>
                <Action.Button auth="host.host.console" onClick={() => this.handleConsole(info)}>Console</Action.Button>
              </Action>
            )}/>
          )}
        </Table>
        {store.formVisible && <ComForm/>}
        {store.importVisible && <ComImport/>}
      </React.Fragment>
    )
  }
}

export default ComTable
