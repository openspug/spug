import React from 'react';
import { Button, Form, Input } from 'antd';
import styles from './index.module.css';


export default function MailServer(props) {
  return (
    <React.Fragment>
      <div className={styles.title}>邮件服务设置</div>
      <Form className={styles.form}>
        <Form.Item colon={false} required label="邮件服务器">
          <Input placeholder="请输入，例如：smtp.exmail.qq.com"/>
        </Form.Item>
        <Form.Item colon={false} required label="端口">
          <Input placeholder="请输入，例如：465"/>
        </Form.Item>
        <Form.Item colon={false} required label="邮件账号">
          <Input placeholder="请输入，例如：dev@exmail.com"/>
        </Form.Item>
        <Form.Item colon={false} required label="账号密码">
          <Input.Password placeholder="请输入邮箱账号对应的密码" />
        </Form.Item>
        <Form.Item colon={false} label="发件人昵称">
          <Input placeholder="请输入" />
        </Form.Item>
        <Button type="primary">保存设置</Button>
      </Form>
    </React.Fragment>
  )
}