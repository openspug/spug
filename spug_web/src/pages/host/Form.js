/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, Select, Col, Button, message } from 'antd';
import http from 'libs/http';
import store from './store';

@observer
class ComForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      password: null,
      zone: null,
    }
  }

  handleSubmit = () => {
    this.setState({loading: true});
    const formData = this.props.form.getFieldsValue();
    formData['id'] = store.record.id;
    http.post('/api/host/', formData)
      .then(res => {
        if (res === 'auth fail') {
          this.setState({loading: false});
          Modal.confirm({
            icon: 'exclamation-circle',
            title: '首次验证请输入密码',
            content: this.confirmForm(formData.username),
            onOk: () => this.handleConfirm(formData),
          })
        } else {
          message.success('操作成功');
          store.formVisible = false;
          store.fetchRecords()
        }
      }, () => this.setState({loading: false}))
  };

  handleConfirm = (formData) => {
    if (this.state.password) {
      formData['password'] = this.state.password;
      return http.post('/api/host/', formData).then(res => {
        message.success('验证成功');
        store.formVisible = false;
        store.fetchRecords()
      })
    }
    message.error('请输入授权密码')
  };

  confirmForm = (username) => {
    return (
      <Form>
        <Form.Item required label="授权密码" help={`用户 ${username} 的密码， 该密码仅做首次验证使用，不会存储该密码。`}>
          <Input.Password onChange={val => this.setState({password: val.target.value})}/>
        </Form.Item>
      </Form>
    )
  };

  handleAddZone = () => {
    Modal.confirm({
      icon: 'exclamation-circle',
      title: '添加主机类别',
      content: this.addZoneForm,
      onOk: () => {
        if (this.state.zone) {
          store.zones.push(this.state.zone);
          this.props.form.setFieldsValue({'zone': this.state.zone})
        }
      },
    })
  };

  addZoneForm = (
    <Form>
      <Form.Item required label="主机类别">
        <Input onChange={val => this.setState({zone: val.target.value})}/>
      </Form.Item>
    </Form>
  );

  render() {
    const info = store.record;
    const {getFieldDecorator} = this.props.form;
    return (
      <Modal
        visible
        width={800}
        maskClosable={false}
        title={store.record.id ? '编辑主机' : '新建主机'}
        okText="验证"
        onCancel={() => store.formVisible = false}
        confirmLoading={this.state.loading}
        onOk={this.handleSubmit}>
        <Form labelCol={{span: 6}} wrapperCol={{span: 14}}>
          <Form.Item required label="主机类别">
            <Col span={16}>
              {getFieldDecorator('zone', {initialValue: info['zone']})(
                <Select placeholder="请选择主机类别/区域/分组">
                  {store.zones.map(item => (
                    <Select.Option value={item} key={item}>{item}</Select.Option>
                  ))}
                </Select>
              )}
            </Col>
            <Col span={6} offset={2}>
              <Button type="link" onClick={this.handleAddZone}>添加类别</Button>
            </Col>
          </Form.Item>
          <Form.Item required label="主机别名">
            {getFieldDecorator('name', {initialValue: info['name']})(
              <Input placeholder="请输入主机别名"/>
            )}
          </Form.Item>
          <Form.Item required label="连接地址" style={{marginBottom: 0}}>
            <Form.Item style={{display: 'inline-block', width: 'calc(30%)'}}>
              {getFieldDecorator('username', {initialValue: info['username']})(
                <Input addonBefore="ssh" placeholder="用户名"/>
              )}
            </Form.Item>
            <Form.Item style={{display: 'inline-block', width: 'calc(40%)'}}>
              {getFieldDecorator('hostname', {initialValue: info['hostname']})(
                <Input addonBefore="@" placeholder="主机名/IP"/>
              )}
            </Form.Item>
            <Form.Item style={{display: 'inline-block', width: 'calc(30%)'}}>
              {getFieldDecorator('port', {initialValue: info['port']})(
                <Input addonBefore="-p" placeholder="端口"/>
              )}
            </Form.Item>
          </Form.Item>
          <Form.Item label="备注信息">
            {getFieldDecorator('desc', {initialValue: info['desc']})(
              <Input.TextArea placeholder="请输入主机备注信息"/>
            )}
          </Form.Item>
          <Form.Item wrapperCol={{span: 14, offset: 6}}>
            <span role="img" aria-label="notice">⚠️ 首次验证时需要输入登录用户名对应的密码，但不会存储该密码。</span>
          </Form.Item>
        </Form>
      </Modal>
    )
  }
}

export default Form.create()(ComForm)
