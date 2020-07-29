/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { toJS } from 'mobx';
import { observer } from 'mobx-react';
import { Table, Divider, Modal, Tag, Icon, message } from 'antd';
import http from 'libs/http';
import store from './store';
import { LinkButton } from "components";
import CloneConfirm from './CloneConfirm';
import envStore from 'pages/config/environment/store';
import lds from 'lodash';

@observer
class ComTable extends React.Component {
  constructor(props) {
    super(props);
    this.cloneObj = null;
  }

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
        <LinkButton auth="deploy.app.edit" onClick={e => store.showExtForm(e, info.id)}>新建发布</LinkButton>
        <Divider type="vertical"/>
        <LinkButton auth="deploy.app.edit" onClick={e => this.handleClone(e, info.id)}>克隆发布</LinkButton>
        <Divider type="vertical"/>
        <LinkButton auth="deploy.app.edit" onClick={e => store.showForm(e, info)}>编辑</LinkButton>
        <Divider type="vertical"/>
        <LinkButton auth="deploy.app.del" onClick={e => this.handleDelete(e, info)}>删除</LinkButton>
      </span>
    )
  }];

  handleClone = (e, id) => {
    e.stopPropagation();
    this.cloneObj = null;
    Modal.confirm({
      icon: 'exclamation-circle',
      title: '选择克隆对象',
      content: <CloneConfirm onChange={v => this.cloneObj = v[1]}/>,
      onOk: () => {
        if (!this.cloneObj) {
          message.error('请选择目标应用及环境')
          return Promise.reject()
        }
        const info = JSON.parse(this.cloneObj);
        store.showExtForm(null, id, info, true)
      },
    })
  };

  handleDelete = (e, text) => {
    e.stopPropagation();
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
      content: `删除发布配置将会影响基于该配置所创建发布申请的发布和回滚功能，确定要删除【${lds.get(envStore.idMap, `${text.env_id}.name`)}】的发布配置?`,
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
          <LinkButton auth="deploy.app.config"
                      onClick={e => store.showExtForm(e, record.id, info, false, true)}>查看</LinkButton>
          <Divider type="vertical"/>
          <LinkButton auth="deploy.app.edit" onClick={e => store.showExtForm(e, record.id, info)}>编辑</LinkButton>
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
      pagination={false}/>
  };

  render() {
    let data = Object.values(toJS(store.records));
    if (store.f_name) {
      data = data.filter(item => item['name'].toLowerCase().includes(store.f_name.toLowerCase()))
    }
    if (store.f_desc) {
      data = data.filter(item => item['desc'] && item['desc'].toLowerCase().includes(store.f_desc.toLowerCase()))
    }

    return (
      <Table
        rowKey="id"
        expandRowByClick
        loading={store.isFetching}
        dataSource={data}
        expandedRowRender={this.expandedRowRender}
        pagination={{
          showSizeChanger: true,
          showLessItems: true,
          hideOnSinglePage: true,
          pageSizeOptions: ['10', '20', '50', '100']
        }}
        columns={this.columns}/>
    )
  }
}

export default ComTable
