import React from 'react';
import { Modal, Form, Input, message } from 'antd';
import http from 'libs/http';
import store from './store';

class ComForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false
    }
  }

  handleSubmit = () => {
    this.setState({loading: true});
    const formData = this.props.form.getFieldsValue();
    formData['id'] = store.record.id;
    http.post('/api/account/user/', formData)
      .then(() => {
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
          <Form.Item required label="密码">
            {getFieldDecorator('password', {initialValue: info.id ? '******' : undefined})(
              <Input type="password" placeholder="请输入密码"/>
            )}
          </Form.Item>
        </Form>
      </Modal>
    )
  }
}

export default Form.create()(ComForm)