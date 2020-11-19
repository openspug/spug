/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Form, Switch, message } from 'antd';
import styles from './index.module.css';
import http from 'libs/http';
import store from './store';
import lds from 'lodash';


export default observer(function () {
  function handleChangeVerifyIP(v) {
    lds.set(store.settings, 'verify_ip.value', v);
    http.post('/api/setting/', {data: [{key: 'verify_ip', value: v}]})
      .then(() => {
        message.success('设置成功');
        store.fetchSettings()
      })
  }

  const checked = lds.get(store.settings, 'verify_ip.value') !== 'False'

  return (
    <React.Fragment>
      <div className={styles.title}>安全设置</div>
      <Form style={{maxWidth: 500}}>
        <Form.Item
          label="访问IP校验"
          help="建议开启，校验是否获取了真实的访问者IP，防止因为增加的反向代理层导致基于IP的安全策略失效，当校验失败时会在登录时弹窗提醒。如果你在内网部署且仅在内网使用可以关闭该特性。">
          <Switch
            checkedChildren="开启"
            unCheckedChildren="关闭"
            onChange={handleChangeVerifyIP}
            checked={checked} />
        </Form.Item>
      </Form>
    </React.Fragment>
  )
})
