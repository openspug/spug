/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Table, Modal, message } from 'antd';
import ComForm from './Form';
import { http, hasPermission } from 'libs';
import store from './store';
import { Action } from "components";

@observer
class ComTable extends React.Component {
  componentDidMount() {
    store.fetchRecords()
  }

  handleDelete = (text) => {
    Modal.confirm({
      title: '删除确认',
      content: `确定要删除【${text['name']}】?`,
      onOk: () => {
        return http.delete('/api/config/environment/', {params: {id: text.id}})
          .then(() => {
            message.success('删除成功');
            store.fetchRecords()
          })
      }
    })
  };

  render() {
    let data = store.records;
    if (store.f_name) {
      data = data.filter(item => item['name'].toLowerCase().includes(store.f_name.toLowerCase()))
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
          <Table.Column title="序号" key="series" render={(_, __, index) => index + 1}/>
          <Table.Column title="环境名称" dataIndex="name"/>
          <Table.Column title="标识符" dataIndex="key"/>
          <Table.Column ellipsis title="描述信息" dataIndex="desc"/>
          {hasPermission('config.env.edit|config.env.del') && (
            <Table.Column title="操作" render={info => (
              <Action>
                <Action.Button auth="config.env.edit" onClick={() => store.showForm(info)}>编辑</Action.Button>
                <Action.Button auth="config.env.del" onClick={() => this.handleDelete(info)}>删除</Action.Button>
              </Action>
            )}/>
          )}
        </Table>
        {store.formVisible && <ComForm/>}
      </React.Fragment>
    )
  }
}

export default ComTable
