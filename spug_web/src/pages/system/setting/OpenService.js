/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Form, Button, Input, message } from 'antd';
import styles from './index.module.css';
import http from 'libs/http';
import store from './store';

export default observer(function () {
  function handleSubmit() {
    store.loading = true;
    const value = store.settings.api_key;
    http.post('/api/setting/', {data: [{key: 'api_key', value}]})
      .then(() => {
        message.success('保存成功');
        store.fetchSettings()
      })
      .finally(() => store.loading = false)
  }

  return (
    <React.Fragment>
      <div className={styles.title}>开放服务设置</div>
      <Form layout="vertical" style={{maxWidth: 320}}>
        <Form.Item colon={false} label="访问凭据" extra="该自定义凭据用于访问平台的开放服务，例如：配置中心的配置获取API等，其他开放服务请查询官方文档。">
          <Input
            value={store.settings.api_key}
            onChange={e => store.settings.api_key = e.target.value}
            placeholder="请输入自定义Token"/>
        </Form.Item>
        <Form.Item style={{marginTop: 24}}>
          <Button type="primary" loading={store.loading} onClick={handleSubmit}>保存设置</Button>
        </Form.Item>
      </Form>
    </React.Fragment>
  )
})
