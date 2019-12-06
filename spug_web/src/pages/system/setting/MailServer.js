import React, { useState } from 'react';
import {observer} from 'mobx-react';
import { Button, Form, Input, message } from 'antd';
import { http } from 'libs';
import styles from './index.module.css';
import store from './store'
import lds from 'lodash';


function MailServer(props) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    props.form.validateFields((err, formData) => {
      if (!err) {
        setLoading(true);
        const data = {key: 'mail_service', value: JSON.stringify(formData), desc: 'mail service'};
        http.post('/api/setting/', {data: [data]})
          .then(() => {
            message.success('保存成功')
          })
          .finally(() => setLoading(false))
      }
    });
  };
  const {getFieldDecorator} = props.form;
  const setting = JSON.parse(lds.get(store.settings, 'mail_service.value', "{}"));
  return (
    <React.Fragment>
      <div className={styles.title}>邮件服务设置</div>
      <Form className={styles.form}>
        <Form.Item colon={false} required label="邮件服务器">
          {getFieldDecorator('server', {
            initialValue: setting['server'], rules: [
              {required: true, message: '请输入邮件服务器地址'}
            ]
          })(
            <Input placeholder="请输入，例如：smtp.exmail.qq.com"/>
          )}
        </Form.Item>
        <Form.Item colon={false} required label="端口">
          {getFieldDecorator('port', {
            initialValue: setting['port'], rules: [
              {required: true, message: '请输入邮件服务端口'}
            ]
          })(
            <Input placeholder="请输入，例如：465"/>
          )}
        </Form.Item>
        <Form.Item colon={false} required label="邮件账号">
          {getFieldDecorator('username', {
            initialValue: setting['username'], rules: [
              {required: true, message: '请输入邮件账号'}
            ]
          })(
            <Input placeholder="请输入，例如：dev@exmail.com"/>
          )}
        </Form.Item>
        <Form.Item colon={false} required label="账号密码">
          {getFieldDecorator('password', {
            initialValue: setting['password'], rules: [
              {required: true, message: '请输入邮箱账号对应的密码'}
            ]
          })(
            <Input.Password placeholder="请输入邮箱账号对应的密码"/>
          )}
        </Form.Item>
        <Form.Item colon={false} label="发件人昵称">
          {getFieldDecorator('nickname', {initialValue: setting['nickname']})(
            <Input placeholder="请输入"/>
          )}
        </Form.Item>
        <Button type="primary" loading={loading} onClick={handleSubmit}>保存设置</Button>
      </Form>
    </React.Fragment>
  )
}

export default observer(Form.create()(MailServer))