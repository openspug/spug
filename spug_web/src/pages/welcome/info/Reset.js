/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React, { useState } from 'react';
import { Button, Form, Input, message } from 'antd';
import styles from './index.module.css';
import { http } from 'libs';
import store from './store';
import history from 'libs/history';


export default function Reset(props) {
  const [old_password, setOldPassword] = useState();
  const [new_password, setNewPassword] = useState();
  const [new2_password, setNew2Password] = useState();

  function handleSubmit() {
    if (!old_password) {
      return message.error('请输入原密码')
    } else if (!new_password) {
      return message.error('请输入新密码')
    } else if (new_password !== new2_password) {
      return message.error('两次输入密码不一致')
    }
    store.loading = true;
    http.patch('/api/account/self/', {old_password, new_password})
      .then(() => {
        message.success('密码修改成功');
        history.push('/');
        http.get('/api/account/logout/')
      })
      .finally(() => store.loading = false)
  }

  return (
    <React.Fragment>
      <div className={styles.title}>修改密码</div>
      <Form style={{maxWidth: 320}} labelCol={{span: 6}} wrapperCol={{span: 18}}>
        <Form.Item label="原密码">
          <Input.Password value={old_password} placeholder="请输入" onChange={e => setOldPassword(e.target.value)}/>
        </Form.Item>
        <Form.Item label="新密码">
          <Input.Password value={new_password} placeholder="请输入" onChange={e => setNewPassword(e.target.value)}/>
        </Form.Item>
        <Form.Item label="再次确认">
          <Input.Password value={new2_password} placeholder="请输入" onChange={e => setNew2Password(e.target.value)}/>
        </Form.Item>
        <Form.Item>
          <Button type="primary" loading={store.loading} onClick={handleSubmit}>保存设置</Button>
        </Form.Item>
      </Form>
    </React.Fragment>
  )
}
