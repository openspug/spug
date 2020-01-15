/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { Button, Form, Input } from 'antd';
import styles from './index.module.css';


export default function AlarmSetting(props) {
  return (
    <React.Fragment>
      <div className={styles.title}>报警服务设置</div>
      <Form style={{maxWidth: 320}}>
        <Form.Item colon={false} label="短信报警调用凭据">
          <Input placeholder="请输入"/>
        </Form.Item>
        <Button type="primary">保存设置</Button>
      </Form>
    </React.Fragment>
  )
}
