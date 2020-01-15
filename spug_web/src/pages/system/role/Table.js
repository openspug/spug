/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Table, Divider, Modal, message } from 'antd';
import http from 'libs/http';
import store from './store';
import { LinkButton } from "components";

@observer
class ComTable extends React.Component {
  componentDidMount() {
    store.fetchRecords()
  }

  columns = [{
    title: '角色名称',
    dataIndex: 'name',
  }, {
    title: '权限个数',
    dataIndex: 'type',
  }, {
    title: '描述信息',
    dataIndex: 'desc',
    ellipsis: true
  }, {
    title: '操作',
    width: 300,
    render: info => (
      <span>
        <LinkButton onClick={() => store.showForm(info)}>编辑</LinkButton>
        <Divider type="vertical"/>
        <LinkButton onClick={() => store.showPagePerm(info)}>功能权限</LinkButton>
        <Divider type="vertical"/>
        <LinkButton onClick={() => store.showDeployPerm(info)}>发布权限</LinkButton>
        <Divider type="vertical"/>
        <LinkButton onClick={() => this.handleDelete(info)}>删除</LinkButton>
      </span>
    )
  }];

  handleDelete = (text) => {
    Modal.confirm({
      title: '删除确认',
      content: `确定要删除【${text['name']}】?`,
      onOk: () => {
        return http.delete('/api/account/role/', {params: {id: text.id}})
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
      <Table rowKey="id" loading={store.isFetching} dataSource={data} columns={this.columns}/>
    )
  }
}

export default ComTable
