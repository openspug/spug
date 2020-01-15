/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Table, Tag } from 'antd';
import store from './store';
import groupStore from '../group/store';

@observer
class ComTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      groupMap: {}
    }
  }
  componentDidMount() {
    store.fetchRecords();
    if (groupStore.records.length === 0) {
      groupStore.fetchRecords().then(this._handleGroups)
    } else {
      this._handleGroups()
    }
  }

  _handleGroups = () => {
    const tmp = {};
    for (let item of groupStore.records) {
      tmp[item.id] = item.name
    }
    this.setState({groupMap: tmp})
  };

  columns = [{
    title: '任务名称',
    dataIndex: 'name',
  }, {
    title: '监控类型',
    dataIndex: 'type',
  }, {
    title: '状态',
    dataIndex: 'status',
    render: value => value === '1' ? <Tag color="orange">报警发生</Tag> : <Tag color="green">故障恢复</Tag>
  }, {
    title: '持续时间',
    dataIndex: 'duration',
  }, {
    title: '通知方式',
    dataIndex: 'notify_mode',
  }, {
    title: '通知对象',
    dataIndex: 'notify_grp',
    render: value => value.map(id => this.state.groupMap[id]).join(',')
  }, {
    title: '发生时间',
    dataIndex: 'created_at'
  }];

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
