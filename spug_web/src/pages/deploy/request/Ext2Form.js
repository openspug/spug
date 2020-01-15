/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, Tag, message } from 'antd';
import hostStore from 'pages/host/store';
import http from 'libs/http';
import store from './store';
import lds from 'lodash';

@observer
class Ext2Form extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      type: null,
      host_ids: store.record['app_host_ids'].concat()
    }
  }

  componentDidMount() {
    if (hostStore.records.length === 0) {
      hostStore.fetchRecords()
    }
  }

  handleSubmit = () => {
    if (this.state.host_ids.length === 0) {
      return message.error('请至少选择一个要发布的目标主机')
    }
    this.setState({loading: true});
    const formData = this.props.form.getFieldsValue();
    formData['id'] = store.record.id;
    formData['deploy_id'] = store.record.deploy_id;
    formData['extra'] = [formData['extra']];
    formData['host_ids'] = this.state.host_ids;
    http.post('/api/deploy/request/', formData)
      .then(res => {
        message.success('操作成功');
        store.ext2Visible = false;
        store.fetchRecords()
      }, () => this.setState({loading: false}))
  };

  handleChange = (id, v) => {
    const host_ids = this.state.host_ids;
    const index = host_ids.indexOf(id);
    if (index === -1) {
      this.setState({host_ids: [id, ...host_ids]})
    } else {
      host_ids.splice(index, 1);
      this.setState({host_ids})
    }
  };

  render() {
    const info = store.record;
    const {host_ids} = this.state;
    const {getFieldDecorator} = this.props.form;
    return (
      <Modal
        visible
        width={800}
        maskClosable={false}
        title="新建发布申请"
        onCancel={() => store.ext2Visible = false}
        confirmLoading={this.state.loading}
        onOk={this.handleSubmit}>
        <Form labelCol={{span: 6}} wrapperCol={{span: 14}}>
          <Form.Item required label="申请标题">
            {getFieldDecorator('name', {initialValue: info['name']})(
              <Input placeholder="请输入申请标题"/>
            )}
          </Form.Item>
          <Form.Item label="环境变量（SPUG_RELEASE）" help="可以在自定义脚本中引用该变量，用于设置本次发布相关的动态变量，在脚本中通过 $SPUG_RELEASE 来使用该值">
            {getFieldDecorator('extra', {initialValue: info['extra']})(
              <Input placeholder="请输入环境变量 SPUG_RELEASE 的值"/>
            )}
          </Form.Item>
          <Form.Item label="备注信息">
            {getFieldDecorator('desc', {initialValue: info['desc']})(
              <Input placeholder="请输入备注信息"/>
            )}
          </Form.Item>
          <Form.Item required label="发布目标主机">
            {info['app_host_ids'].map(id => (
              <Tag.CheckableTag key={id} checked={host_ids.includes(id)} onChange={v => this.handleChange(id, v)}>
                {lds.get(hostStore.idMap, `${id}.name`)}({lds.get(hostStore.idMap, `${id}.hostname`)}:{lds.get(hostStore.idMap, `${id}.port`)})
              </Tag.CheckableTag>
            ))}
          </Form.Item>
        </Form>
      </Modal>
    )
  }
}

export default Form.create()(Ext2Form)
