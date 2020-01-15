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
import { LinkButton, AuthLink } from 'components';

@observer
class ComTable extends React.Component {
  componentDidMount() {
    store.fetchRecords()
  }

  columns = [{
    title: '序号',
    key: 'series',
    render: (_, __, index) => index + 1,
    width: 80,
  }, {
    title: '应用名称',
    dataIndex: 'name',
  }, {
    title: '标识符',
    dataIndex: 'key',
  }, {
    title: '描述信息',
    dataIndex: 'desc',
    ellipsis: true
  }, {
    title: '操作',
    render: info => (
      <span>
        <LinkButton auth="config.app.edit" onClick={() => store.showForm(info)}>编辑</LinkButton>
        <Divider type="vertical"/>
        <LinkButton auth="config.app.del" onClick={() => this.handleDelete(info)}>删除</LinkButton>
        <Divider type="vertical"/>
        <LinkButton auth="config.app.view_config" onClick={() => store.showRel(info)}>依赖</LinkButton>
        <Divider type="vertical"/>
        <AuthLink auth="config.app.view_config" to={`/config/setting/app/${info.id}`}>配置</AuthLink>
      </span>
    )
  }];

  handleDelete = (text) => {
    Modal.confirm({
      title: '删除确认',
      content: `确定要删除【${text['name']}】?`,
      onOk: () => {
        return http.delete('/api/app/', {params: {id: text.id}})
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
