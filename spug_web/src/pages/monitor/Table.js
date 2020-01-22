/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Table, Divider, Modal, Tag, message } from 'antd';
import { LinkButton } from 'components';
import ComForm from './Form';
import http from 'libs/http';
import store from './store';
import hostStore from '../host/store';
import lds from 'lodash';
import moment from "moment";
import groupStore from "pages/alarm/group/store";

@observer
class ComTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hosts: {}
    }
  }

  componentDidMount() {
    store.fetchRecords();
    if (groupStore.records.length === 0) groupStore.fetchRecords();
    if (hostStore.records.length === 0) {
      hostStore.fetchRecords().then(this._handleHosts)
    } else {
      this._handleHosts()
    }
  }

  _handleHosts = () => {
    const tmp = {};
    for (let item of hostStore.records) {
      tmp[item.id] = item
    }
    this.setState({hosts: tmp})
  };

  columns = [{
    title: '序号',
    key: 'series',
    render: (_, __, index) => index + 1,
    width: 80
  }, {
    title: '任务名称',
    dataIndex: 'name',
  }, {
    title: '类型',
    dataIndex: 'type_alias',
  }, {
    title: '地址',
    render: info => {
      if ('34'.includes(info.type)) {
        return lds.get(this.state.hosts, `${info.addr}.name`)
      } else {
        return info.addr
      }
    },
    ellipsis: true
  }, {
    title: '频率',
    dataIndex: 'rate',
    render: value => `${value}分钟`
  }, {
    title: '状态',
    render: info => {
      if (info.is_active) {
        if (info['latest_status'] === 0) {
          return <Tag color="green">正常</Tag>
        } else if (info['latest_status'] === 1) {
          return <Tag color="red">异常</Tag>
        } else {
          return <Tag color="orange">待检测</Tag>
        }
      } else {
        return <Tag>未启用</Tag>
      }
    }
  }, {
    title: '更新于',
    dataIndex: 'latest_run_time',
  }, {
    title: '操作',
    render: info => (
      <span>
        <LinkButton auth="monitor.monitor.edit" onClick={() => this.handleActive(info)}>{info['is_active'] ? '禁用' : '启用'}</LinkButton>
        <Divider type="vertical"/>
        <LinkButton auth="monitor.monitor.edit" onClick={() => store.showForm(info)}>编辑</LinkButton>
        <Divider type="vertical"/>
        <LinkButton auth="monitor.monitor.del" onClick={() => this.handleDelete(info)}>删除</LinkButton>
      </span>
    ),
    width: 180
  }];

  handleActive = (text) => {
    Modal.confirm({
      title: '操作确认',
      content: `确定要${text['is_active'] ? '禁用' : '启用'}【${text['nickname']}】?`,
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
    let data = store.records;
    if (store.f_name) {
      data = data.filter(item => item['name'].toLowerCase().includes(store.f_name.toLowerCase()))
    }
    if (store.f_status !== undefined) {
      if (store.f_status === -3) {
        data = data.filter(item => !item['is_active'])
      } else if (store.f_status === -2) {
        data = data.filter(item => item['is_active'])
      } else if (store.f_status === -1) {
        data = data.filter(item => item['is_active'] && !item['latest_status_alias'])
      } else {
        data = data.filter(item => item['latest_status'] === store.f_status)
      }
    }
    return (
      <React.Fragment>
        <Table rowKey="id" loading={store.isFetching} dataSource={data} columns={this.columns}/>
        {store.formVisible && <ComForm/>}
      </React.Fragment>
    )
  }
}

export default ComTable
