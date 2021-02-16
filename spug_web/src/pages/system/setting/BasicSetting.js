/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { observer } from 'mobx-react';
import { Form, Popover, Input, Button, message } from 'antd';
import styles from './index.module.css';
import { http } from 'libs';
import store from './store';

export default observer(function () {
  const [spug_key, setSpugKey] = useState(store.settings.spug_key);

  function handleSubmit() {
    if (!spug_key) return message.error('请输入调用凭据');
    store.loading = true;
    http.post('/api/setting/', {data: [{key: 'spug_key', value: spug_key}]})
      .then(() => {
        message.success('保存成功');
        store.fetchSettings()
      })
      .finally(() => store.loading = false)
  }

  const spugWx = <img src="http://image.qbangmang.com/spug-weixin.jpeg" alt='spug'/>;
  return (
    <React.Fragment>
      <div className={styles.title}>基本设置</div>
      <div style={{maxWidth: 340}}>
        <Form.Item
          label="调用凭据"
          labelCol={{span: 24}}
          help={<span>如需要使用Spug的邮件、微信和短信等内置服务，请关注公众号
              <span style={{color: '#008dff', cursor: 'pointer'}}>
                  <Popover content={spugWx}>
                    <span>Spug运维</span>
                  </Popover>
              </span>
              在【我的】页面获取调用凭据，否则请留空。</span>}>
          <Input
            value={spug_key}
            onChange={e => setSpugKey(e.target.value)}
            placeholder="请输入Spug微信公众号获取到的Token"/>
        </Form.Item>
        <Form.Item style={{marginTop: 24}}>
          <Button type="primary" loading={store.loading} onClick={handleSubmit}>保存设置</Button>
        </Form.Item>
      </div>
    </React.Fragment>
  )
})
