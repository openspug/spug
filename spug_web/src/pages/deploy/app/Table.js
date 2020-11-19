/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { toJS } from 'mobx';
import { observer } from 'mobx-react';
import { Table, Modal, Tag, Icon, Divider, message } from 'antd';
import { http, hasPermission } from 'libs';
import store from './store';
import { Action } from "components";
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
        info.env_id = undefined;
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

  handleSort = (e, info, sort) => {
    e.stopPropagation();
    store.fetching = true;
    http.patch('/api/app/', {id: info.id, sort})
      .then(store.fetchRecords, () => store.fetching = false)
  };

  expandedRowRender = (record) => {
    if (record['deploys'] === undefined) {
      store.loadDeploys(record.id)
    }

    return <Table
      rowKey="id"
      loading={record['deploys'] === undefined}
      dataSource={record['deploys']}
      pagination={false}>
      <Table.Column width={80} title="模式" dataIndex="extend" render={value => value === '1' ?
        <Icon style={{fontSize: 20, color: '#1890ff'}} type="ordered-list"/> :
        <Icon style={{fontSize: 20, color: '#1890ff'}} type="build"/>}/>
      <Table.Column title="发布环境" dataIndex="env_id" render={value => lds.get(envStore.idMap, `${value}.name`)}/>
      <Table.Column title="关联主机" dataIndex="host_ids" render={value => `${value.length} 台`}/>
      <Table.Column title="发布审核" dataIndex="is_audit"
                    render={value => value ? <Tag color="green">开启</Tag> : <Tag color="red">关闭</Tag>}/>
      {hasPermission('deploy.app.config|deploy.app.edit') && (
        <Table.Column title="操作" render={info => (
          <Action>
            <Action.Button
              auth="deploy.app.config"
              onClick={e => store.showExtForm(e, record.id, info, false, true)}>查看</Action.Button>
            <Action.Button auth="deploy.app.edit"
                           onClick={e => store.showExtForm(e, record.id, info)}>编辑</Action.Button>
            <Action.Button auth="deploy.app.edit" onClick={() => this.handleDeployDelete(info)}>删除</Action.Button>
          </Action>
        )}/>
      )}
    </Table>
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
          showTotal: total => `共 ${total} 条`,
          pageSizeOptions: ['10', '20', '50', '100']
        }}>
        <Table.Column width={80} title="排序" key="series" render={(info) => (
          <div>
            <Icon onClick={e => this.handleSort(e, info, 'up')} type="up-square"
                  style={{cursor: 'pointer', color: '#1890ff'}}/>
            <Divider type="vertical"/>
            <Icon onClick={e => this.handleSort(e, info, 'down')} type="down-square"
                  style={{cursor: 'pointer', color: '#1890ff'}}/>
          </div>
        )}/>
        <Table.Column title="应用名称" dataIndex="name"/>
        <Table.Column title="标识符" dataIndex="key"/>
        <Table.Column ellipsis title="描述信息" dataIndex="desc"/>
        {hasPermission('deploy.app.edit|deploy.app.del') && (
          <Table.Column width={260} title="操作" render={info => (
            <Action>
              <Action.Button auth="deploy.app.edit" onClick={e => store.showExtForm(e, info.id)}>新建发布</Action.Button>
              <Action.Button auth="deploy.app.edit" onClick={e => this.handleClone(e, info.id)}>克隆发布</Action.Button>
              <Action.Button auth="deploy.app.edit" onClick={e => store.showForm(e, info)}>编辑</Action.Button>
              <Action.Button auth="deploy.app.del" onClick={e => this.handleDelete(e, info)}>删除</Action.Button>
            </Action>
          )}/>
        )}
      </Table>
    )
  }
}

export default ComTable
