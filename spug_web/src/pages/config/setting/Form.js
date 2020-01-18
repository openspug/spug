/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import {observer} from 'mobx-react';
import {Modal, Form, Input, Checkbox, Switch, Row, Col, message} from 'antd';
import http from 'libs/http';
import store from './store';
import envStore from '../environment/store'

@observer
class ComForm extends React.Component {
  constructor(props) {
    super(props);
    this.isModify = store.record.id !== undefined;
    this.state = {
      loading: false,
      envs: this.isModify ? [store.env.id] : []
    }
  }

  handleSubmit = () => {
    this.setState({loading: true});
    const formData = this.props.form.getFieldsValue();
    formData['is_public'] = store.type === 'src' ? false : formData['is_public'];
    let request;
    if (this.isModify) {
      formData['id'] = store.record.id;
      request = http.patch('/api/config/', formData)
    } else {
      formData['type'] = store.type;
      formData['o_id'] = store.id;
      formData['envs'] = this.state.envs;
      request = http.post('/api/config/', formData)
    }
    request.then(res => {
      message.success('操作成功');
      store.formVisible = false;
      store.fetchRecords()
    }, () => this.setState({loading: false}))
  };

  handleEnvCheck = (id) => {
    if (!this.isModify) {
      const index = this.state.envs.indexOf(id);
      if (index !== -1) {
        this.state.envs.splice(index, 1);
      } else {
        this.state.envs.push(id);
      }
      this.setState({envs: this.state.envs})
    }
  };

  render() {
    const info = store.record;
    const {envs} = this.state;
    const {getFieldDecorator} = this.props.form;
    return (
      <Modal
        visible
        width={800}
        maskClosable={false}
        title={store.record.id ? '更新配置' : '新增配置'}
        onCancel={() => store.formVisible = false}
        confirmLoading={this.state.loading}
        onOk={this.handleSubmit}>
        <Form labelCol={{span: 6}} wrapperCol={{span: 14}}>
          <Form.Item required label="Key">
            {getFieldDecorator('key', {initialValue: info['key']})(
              <Input disabled={this.isModify} placeholder="请输入"/>
            )}
          </Form.Item>
          <Form.Item label="Value">
            {getFieldDecorator('value', {initialValue: info['value']})(
              <Input.TextArea placeholder="请输入"/>
            )}
          </Form.Item>
          <Form.Item label="备注">
            {getFieldDecorator('desc', {initialValue: info['desc']})(
              <Input.TextArea placeholder="请输入备注信息"/>
            )}
          </Form.Item>
          {store.type === 'app' && (
            <Form.Item label="类型">
              {getFieldDecorator('is_public', {
                initialValue: info['is_public'] === undefined || info['is_public'],
                valuePropName: 'checked'
              })(
                <Switch checkedChildren="公共" unCheckedChildren="私有"/>
              )}
            </Form.Item>
          )}
          <Form.Item label="选择环境">
            {envStore.records.map((item, index) => (
              <Row
                key={item.id}
                onClick={() => this.handleEnvCheck(item.id)}
                style={{cursor: 'pointer', borderTop: index ? '1px solid #e8e8e8' : ''}}>
                <Col span={2}><Checkbox disabled={this.isModify} checked={envs.includes(item.id)}/></Col>
                <Col span={3}>{item.key}</Col>
                <Col span={4}>{item.name}</Col>
                <Col span={15}>{item.desc}</Col>
              </Row>
            ))}
          </Form.Item>
        </Form>
      </Modal>
    )
  }
}

export default Form.create()(ComForm)
