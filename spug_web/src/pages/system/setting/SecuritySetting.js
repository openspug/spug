/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { observer } from 'mobx-react';
import { Form, Switch, message } from 'antd';
import styles from './index.module.css';
import http from 'libs/http';
import store from './store';

export default observer(function () {
  const [verify_ip, setVerifyIP] = useState(store.settings.verify_ip);
  const [mfa, setMFA] = useState(store.settings.MFA || {});

  function handleChangeVerifyIP(v) {
    setVerifyIP(v);
    http.post('/api/setting/', {data: [{key: 'verify_ip', value: v}]})
      .then(() => {
        message.success('设置成功');
        store.fetchSettings()
      })
  }

  function handleChangeMFA(v) {
    if (v && !store.settings.spug_key) return message.error('开启MFA认证需要先在基本设置中配置调用凭据');
    if (v) {
      http.get('/api/setting/mfa_test/')
        .then(() => _doModify(v))
    } else {
      _doModify(v)
    }
  }

  function _doModify(v) {
    setMFA({...mfa, enable: v});
    http.post('/api/setting/', {data: [{key: 'MFA', value: {...mfa, enable: v}}]})
      .then(() => {
        message.success('设置成功');
        store.fetchSettings()
      })
  }

  return (
    <React.Fragment>
      <div className={styles.title}>安全设置</div>
      <Form layout="vertical" style={{maxWidth: 500}}>
        <Form.Item
          label="访问IP校验"
          help="建议开启，校验是否获取了真实的访问者IP，防止因为增加的反向代理层导致基于IP的安全策略失效，当校验失败时会在登录时弹窗提醒。如果你在内网部署且仅在内网使用可以关闭该特性。">
          <Switch
            checkedChildren="开启"
            unCheckedChildren="关闭"
            onChange={handleChangeVerifyIP}
            checked={verify_ip}/>
        </Form.Item>
        <Form.Item
          label="登录MFA（两步）认证"
          style={{marginTop: 24}}
          help={<span>建议开启，登录时额外使用验证码进行身份验证。开启前至少要确保管理员账户配置了微信Token（账户管理/用户/编辑），开启后未配置微信Token的账户将无法登录，<a
            target="_blank" rel="noopener noreferrer" href="https://spug.cc/docs/wx-token/">什么是微信Token？</a></span>}>
          <Switch
            checkedChildren="开启"
            unCheckedChildren="关闭"
            onChange={handleChangeMFA}
            checked={mfa.enable}/>
        </Form.Item>
      </Form>
    </React.Fragment>
  )
})
