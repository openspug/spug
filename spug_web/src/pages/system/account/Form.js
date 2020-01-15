/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import {Modal, Form, Select, Input, message, Col} from 'antd';
import http from 'libs/http';
import store from './store';
import roleStore from '../role/store';
import {Link} from "react-router-dom";

class ComForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false
    }
  }

  componentDidMount() {
    if (roleStore.records.length === 0) {
      roleStore.fetchRecords()
    }
  }

  handleSubmit = () => {
    this.setState({loading: true});
    const formData = this.props.form.getFieldsValue();
    let request;
    if (store.record.id) {
      formData['id'] = store.record.id;
      request = http.patch('/api/account/user/', formData)
    } else {
      request = http.post('/api/account/user/', formData)
    }
    request.then(() => {
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
        title={store.record.id ? '编辑账户' : '新建账户'}
        onCancel={() => store.formVisible = false}
        confirmLoading={this.state.loading}
        onOk={this.handleSubmit}>
        <Form labelCol={{span: 6}} wrapperCol={{span: 14}}>
          <Form.Item required label="登录名">
            {getFieldDecorator('username', {initialValue: info['username']})(
              <Input placeholder="请输入登录名"/>
            )}
          </Form.Item>
          <Form.Item required label="姓名">
            {getFieldDecorator('nickname', {initialValue: info['nickname']})(
              <Input placeholder="请输入姓名"/>
            )}
          </Form.Item>
          {info.id === undefined && (
            <Form.Item required label="密码">
              {getFieldDecorator('password')(
                <Input type="password" placeholder="请输入密码"/>
              )}
            </Form.Item>
          )}
          <Form.Item required label="角色">
            <Col span={18}>
              {getFieldDecorator('role_id', {initialValue: info['role_id']})(
                <Select placeholder="请选择">
                  {roleStore.records.map(item => (
                    <Select.Option value={item.id} key={item.id}>{item.name}</Select.Option>
                  ))}
                </Select>
              )}
            </Col>
            <Col span={4} offset={2}>
              <Link to="/system/role">新建角色</Link>
            </Col>
          </Form.Item>
        </Form>
      </Modal>
    )
  }
}

export default Form.create()(ComForm)
