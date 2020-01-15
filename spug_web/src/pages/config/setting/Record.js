/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Modal, Table, Tooltip, Tag } from 'antd';
import http from 'libs/http';
import store from './store';

@observer
class Record extends React.Component {
  constructor(props) {
    super(props);
    this.isModify = store.record.id !== undefined;
    this.state = {
      loading: true,
      envs: this.isModify ? [store.env.id] : []
    }
  }

  componentDidMount() {
    const formData = {type: store.type, o_id: store.id, env_id: store.env.id};
    http.post('/api/config/history/', formData)
      .then(res => this.setState({records: res}))
      .finally(() => this.setState({loading: false}))
  }

  colorMap = {'1': 'green', '2': 'orange', '3': 'red'};

  columns = [{
    title: 'Key',
    key: 'key',
    render: info => <Tooltip title={info.desc}>{info.key}</Tooltip>
  }, {
    title: 'Old Value',
    dataIndex: 'old_value',
    ellipsis: true
  }, {
    title: 'New Value',
    dataIndex: 'value',
    ellipsis: true
  }, {
    title: '动作',
    render: info => <Tag color={this.colorMap[info.action]}>{info['action_alias']}</Tag>
  }, {
    title: '操作人',
    width: 120,
    dataIndex: 'update_user'
  }, {
    title: '操作时间',
    width: 180,
    dataIndex: 'updated_at'
  }];

  render() {
    const {loading, records} = this.state;
    return (
      <Modal
        visible
        width={1000}
        maskClosable={false}
        title={`${store.env.name} - 更改历史记录`}
        onCancel={() => store.recordVisible = false}
        footer={null}>
        <Table rowKey="id" loading={loading} dataSource={records} columns={this.columns} />
      </Modal>
    )
  }
}

export default Record
