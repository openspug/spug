/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, message } from 'antd';
import http from 'libs/http';
import store from './store';

@observer
class ComForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
    }
  }

  handleSubmit = () => {
    this.setState({loading: true});
    const formData = this.props.form.getFieldsValue();
    formData['id'] = store.record.id;
    http.post('/api/alarm/contact/', formData)
      .then(res => {
        message.success('操作成功');
        store.formVisible = false;
        store.fetchRecords()
      }, () => this.setState({loading: false}))
  };

  render() {
    const info = store.record;
    const {getFieldDecorator} = this.props.form;
    return (
      <Modal
        visible
        width={800}
        maskClosable={false}
        title={store.record.id ? '编辑联系人' : '新建联系人'}
        onCancel={() => store.formVisible = false}
        confirmLoading={this.state.loading}
        onOk={this.handleSubmit}>
        <Form labelCol={{span: 6}} wrapperCol={{span: 14}}>
          <Form.Item required label="姓名">
            {getFieldDecorator('name', {initialValue: info['name']})(
              <Input placeholder="请输入联系人姓名"/>
            )}
          </Form.Item>
          <Form.Item label="手机号">
            {getFieldDecorator('phone', {initialValue: info['phone']})(
              <Input placeholder="请输入手机号"/>
            )}
          </Form.Item>
          <Form.Item label="邮箱">
            {getFieldDecorator('email', {initialValue: info['email']})(
              <Input placeholder="请输入邮箱地址"/>
            )}
          </Form.Item>
          <Form.Item label="微信Token">
            {getFieldDecorator('wx_token', {initialValue: info['wx_token']})(
              <Input placeholder="请输入微信token"/>
            )}
          </Form.Item>
          <Form.Item label="钉钉">
            {getFieldDecorator('ding', {initialValue: info['ding']})(
              <Input placeholder="请输入钉钉机器人地址"/>
            )}
          </Form.Item>
        </Form>
      </Modal>
    )
  }
}

export default Form.create()(ComForm)
