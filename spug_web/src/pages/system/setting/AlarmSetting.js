/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Button, Form, Input, Radio, message } from 'antd';
import styles from './index.module.css';
import { http } from 'libs';
import store from './store';
import lds from 'lodash';

@observer
class AlarmSetting extends React.Component {
  constructor(props) {
    super(props);
    this.setting = JSON.parse(lds.get(store.settings, 'mail_service.value', "{}"));
    this.state = {
      mode: this.setting['server'] === undefined ? '1' : '2',
      spug_key: lds.get(store.settings, 'spug_key.value')
    }
  }

  _doSubmit = (formData) => {
    store.loading = true;
    http.post('/api/setting/', {data: formData})
      .then(() => {
        message.success('保存成功');
        store.fetchSettings()
      })
      .finally(() => store.loading = false)
  };

  handleSubmit = () => {
    const {mode, spug_key} = this.state;
    const formData = [{key: 'spug_key', value: spug_key}];
    if (mode === '1') {
      formData.push({key: 'mail_service', value: '{}'});
      this._doSubmit(formData)
    } else {
      this.props.form.validateFields((err, data) => {
        if (!err) {
          formData.push({key: 'mail_service', value: JSON.stringify(data)});
          this._doSubmit(formData)
        }
      })
    }
  };

  render() {
    const {getFieldDecorator} = this.props.form;
    const {mode, spug_key} = this.state;
    return (
      <React.Fragment>
        <div className={styles.title}>报警服务设置</div>
        <Form style={{maxWidth: 400}}>
          <Form.Item
            colon={false}
            label="调用凭据"
            help={<span>该凭据用于调用spug内置的报警服务，请关注公众号<span style={{color: '#008dff'}}>Spug运维</span>在我的页面查看调用凭据。</span>}>
            <Input
              value={spug_key}
              onChange={e => this.setState({spug_key: e.target.value})}
              placeholder="请输入"/>
          </Form.Item>
          <Form.Item colon={false} label="邮件服务" help="用于通过邮件方式发送报警信息">
            <Radio.Group
              value={mode}
              style={{marginBottom: 8}}
              buttonStyle="solid"
              onChange={e => this.setState({mode: e.target.value})}>
              <Radio.Button value="1">内置</Radio.Button>
              <Radio.Button value="2">自定义</Radio.Button>
            </Radio.Group>
            <div style={{display: mode === '1' ? 'none' : 'block'}}>
              <Form.Item labelCol={{span: 8}} wrapperCol={{span: 16}} required label="邮件服务器">
                {getFieldDecorator('server', {
                  initialValue: this.setting['server'], rules: [
                    {required: true, message: '请输入邮件服务器地址'}
                  ]
                })(
                  <Input placeholder="请输入，例如：smtp.exmail.qq.com"/>
                )}
              </Form.Item>
              <Form.Item labelCol={{span: 8}} wrapperCol={{span: 16}} required label="端口">
                {getFieldDecorator('port', {
                  initialValue: this.setting['port'], rules: [
                    {required: true, message: '请输入邮件服务端口'}
                  ]
                })(
                  <Input placeholder="请输入，例如：465"/>
                )}
              </Form.Item>
              <Form.Item labelCol={{span: 8}} wrapperCol={{span: 16}} required label="邮箱账号">
                {getFieldDecorator('username', {
                  initialValue: this.setting['username'], rules: [
                    {required: true, message: '请输入邮箱账号'}
                  ]
                })(
                  <Input placeholder="请输入，例如：dev@exmail.com"/>
                )}
              </Form.Item>
              <Form.Item labelCol={{span: 8}} wrapperCol={{span: 16}} required label="账号密码">
                {getFieldDecorator('password', {
                  initialValue: this.setting['password'], rules: [
                    {required: true, message: '请输入邮箱账号对应的密码'}
                  ]
                })(
                  <Input.Password placeholder="请输入邮箱账号对应的密码"/>
                )}
              </Form.Item>
              <Form.Item labelCol={{span: 8}} wrapperCol={{span: 16}} label="发件人昵称">
                {getFieldDecorator('nickname', {initialValue: this.setting['nickname']})(
                  <Input placeholder="请输入"/>
                )}
              </Form.Item>
            </div>
          </Form.Item>
          <Button
            type="primary"
            loading={store.loading}
            style={{marginTop: 20}}
            onClick={this.handleSubmit}>保存设置</Button>
        </Form>
      </React.Fragment>
    )
  }
}

export default Form.create()(AlarmSetting)
