/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { Button, Form, Input } from 'antd';
import styles from './index.module.css';


export default function BasicSetting(props) {
  return (
    <React.Fragment>
      <div className={styles.title}>基本设置</div>
      <Form style={{maxWidth: 320}}>
        <Form.Item colon={false} label="昵称">
          <Input placeholder="请输入"/>
        </Form.Item>
        <Form.Item colon={false} label="邮箱">
          <Input placeholder="请输入"/>
        </Form.Item>

        <Button type="primary">保存设置</Button>
      </Form>
    </React.Fragment>
  )
}
