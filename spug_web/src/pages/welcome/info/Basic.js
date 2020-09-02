/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { Button, Form, Input, message } from 'antd';
import styles from './index.module.css';
import { http } from 'libs';


export default function Basic(props) {
  const [nickname, setNickname] = useState(localStorage.getItem('nickname'));
  const [loading, setLoading] = useState(false);

  function handleSubmit() {
    setLoading(true);
    http.patch('/api/account/self/', {nickname})
      .then(() => {
        message.success('设置成功，重新登录或刷新页面后生效');
        localStorage.setItem('nickname', nickname)
      })
      .finally(() =>setLoading(false))
  }

  return (
    <React.Fragment>
      <div className={styles.title}>基本设置</div>
      <Form style={{maxWidth: 320}}>
        <Form.Item colon={false} label="昵称">
          <Input value={nickname} placeholder="请输入" onChange={e => setNickname(e.target.value)}/>
        </Form.Item>
        <Form.Item>
          <Button type="primary" loading={loading} onClick={handleSubmit}>保存设置</Button>
        </Form.Item>
      </Form>
    </React.Fragment>
  )
}
