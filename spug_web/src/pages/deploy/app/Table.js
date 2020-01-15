/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { toJS } from 'mobx';
import { observer } from 'mobx-react';
import { Table, Divider, Modal, Tag, Icon, message } from 'antd';
import http from 'libs/http';
import store from './store';
import { LinkButton } from "components";
import envStore from 'pages/config/environment/store';
import lds from 'lodash';

@observer
class ComTable extends React.Component {
  componentDidMount() {
    store.fetchRecords();
    if (envStore.records.length === 0) {
      envStore.fetchRecords()
    }
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
    dataIndex: 'key'
  }, {
    title: '描述信息',
    dataIndex: 'desc',
    ellipsis: true
  }, {
    title: '操作',
    render: info => (
      <span>
        <LinkButton auth="deploy.app.edit" onClick={() => store.showExtForm(info.id)}>新建发布</LinkButton>
        <Divider type="vertical"/>
        <LinkButton auth="deploy.app.edit" onClick={() => store.showForm(info)}>编辑</LinkButton>
        <Divider type="vertical"/>
        <LinkButton auth="deploy.app.del" onClick={() => this.handleDelete(info)}>删除</LinkButton>
      </span>
    )
  }];

  handleDelete = (text) => {
    Modal.confirm({
      title: '删除确认',
      content: `确定要删除应用【${text['name']}】?`,
      onOk: () => {
        return http.delete('/api/app/', {params: {id: text.id}})
          .then(() => {
            message.success('删除成功');
            store.fetchRecords()
          })
      }
    })
  };

  handleDeployDelete = (text) => {
    Modal.confirm({
      title: '删除确认',
      content: `确定要删除【${lds.get(envStore.idMap, `${text.env_id}.name`)}】的发布配置?`,
      onOk: () => {
        return http.delete('/api/app/deploy/', {params: {id: text.id}})
          .then(() => {
            message.success('删除成功');
            store.loadDeploys(text.app_id)
          })
      }
    })
  };

  expandedRowRender = (record) => {
    const columns = [{
      title: '模式',
      dataIndex: 'extend',
      render: value => value === '1' ? <Icon style={{fontSize: 20, color: '#1890ff'}} type="ordered-list"/> :
        <Icon style={{fontSize: 20, color: '#1890ff'}} type="build"/>,
      width: 80
    }, {
      title: '发布环境',
      dataIndex: 'env_id',
      render: value => lds.get(envStore.idMap, `${value}.name`)
    }, {
      title: '关联主机',
      dataIndex: 'host_ids',
      render: value => `${value.length} 台`
    }, {
      title: '发布审核',
      dataIndex: 'is_audit',
      render: value => value ? <Tag color="green">开启</Tag> : <Tag color="red">关闭</Tag>
    }, {
      title: '操作',
      render: info => (
        <span>
        <LinkButton auth="deploy.app.edit" onClick={() => store.showExtForm(record.id, info)}>编辑</LinkButton>
        <Divider type="vertical"/>
        <LinkButton auth="deploy.app.edit" onClick={() => store.showExtForm(record.id, info, true)}>克隆配置</LinkButton>
        <Divider type="vertical"/>
        <LinkButton auth="deploy.app.edit" onClick={() => this.handleDeployDelete(info)}>删除</LinkButton>
      </span>
      )
    }];

    if (record['deploys'] === undefined) {
      store.loadDeploys(record.id)
    }

    return <Table
      rowKey="id"
      loading={record['deploys'] === undefined}
      columns={columns}
      dataSource={record['deploys']}
      pagination={false} />
  };

  render() {
    let data = Object.values(toJS(store.records));
    if (store.f_name) {
      data = data.filter(item => item['name'].toLowerCase().includes(store.f_name.toLowerCase()))
    }

    return (
      <Table
        rowKey="id"
        loading={store.isFetching}
        dataSource={data}
        expandedRowRender={this.expandedRowRender}
        columns={this.columns}/>
    )
  }
}

export default ComTable
