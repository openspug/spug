/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Table, Modal, message } from 'antd';
import ComForm from './Form';
import {http,hasPermission } from 'libs';
import { Action } from "components";
import store from './store';

@observer
class ComTable extends React.Component {
  componentDidMount() {
    store.fetchRecords()
  }

  columns = [{
    title: '模版名称',
    dataIndex: 'name',
  }, {
    title: '模版类型',
    dataIndex: 'type',
  }, {
    title: '模版内容',
    render: text => text.body,
    ellipsis: true
  }, {
    title: '描述信息',
    dataIndex: 'desc',
    ellipsis: true
  }, {
    title: '操作',
    className: hasPermission('exec.template.edit|exec.template.del') ? null : 'none',
    render: info => (
      <Action>
        <Action.Button auth="exec.template.edit" onClick={() => store.showForm(info)}>编辑</Action.Button>
        <Action.Button auth="exec.template.del" onClick={() => this.handleDelete(info)}>删除</Action.Button>
      </Action>
    )
  }];

  handleDelete = (text) => {
    Modal.confirm({
      title: '删除确认',
      content: `确定要删除【${text['name']}】?`,
      onOk: () => {
        return http.delete('/api/exec/template/', {params: {id: text.id}})
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
    if (store.f_type) {
      data = data.filter(item => item['type'].toLowerCase().includes(store.f_type.toLowerCase()))
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
          }}
          columns={this.columns}/>
        {store.formVisible && <ComForm/>}
      </React.Fragment>
    )
  }
}

export default ComTable
