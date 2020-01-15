/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Button, Form, Input, message } from 'antd';
import styles from './index.module.css';
import { http } from 'libs';
import store from './store';
import lds from 'lodash';


export default observer(function () {
  function handleSubmit() {
    store.loading = true;
    const value = lds.get(store.settings, 'spug_key.value');
    http.post('/api/setting/', {data: [{key: 'spug_key', value}]})
      .then(() => {
        message.success('保存成功');
        store.fetchSettings()
      })
      .finally(() => store.loading = false)
  }

  return (
    <React.Fragment>
      <div className={styles.title}>报警服务设置</div>
      <Form style={{maxWidth: 320}}>
        <Form.Item
          colon={false}
          label="调用凭据"
          help={<span>该凭据用于调用spug内置的报警服务，请关注公众号<span style={{color: '#008dff'}}>Spug运维</span>在我的页面查看调用凭据。</span>}>
          <Input
            value={lds.get(store.settings, 'spug_key.value')}
            onChange={e => lds.set(store.settings, 'spug_key.value', e.target.value)}
            placeholder="请输入"/>
        </Form.Item>
        <Button type="primary" loading={store.loading} onClick={handleSubmit}>保存设置</Button>
      </Form>
    </React.Fragment>
  )
})
