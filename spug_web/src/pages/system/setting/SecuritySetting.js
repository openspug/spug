/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, {useState, useEffect} from 'react';
import {observer} from 'mobx-react';
import {Form, Switch, Input, Space, Spin, message, Button} from 'antd';
import styles from './index.module.css';
import http from 'libs/http';
import store from './store';

export default observer(function () {
  const [code, setCode] = useState();
  const [visible, setVisible] = useState(false);
  const [counter, setCounter] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loading2, setLoading2] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      if (counter > 0) {
        setCounter(counter - 1)
      }
    }, 1000)
  }, [counter])

  function handleChangeVerifyIP(v) {
    store.isFetching = true;
    http.post('/api/setting/', {data: [{key: 'verify_ip', value: v}]})
      .then(() => {
        message.success('设置成功');
        store.fetchSettings()
      }, () => store.isFetching = false)
  }

  function handleChangeBindIP(v) {
    store.isFetching = true;
    http.post('/api/setting/', {data: [{key: 'bind_ip', value: v}]})
      .then(() => {
        message.success('设置成功');
        store.fetchSettings()
      }, () => store.isFetching = false)
  }

  function handleChangeMFA(v) {
    if (v && !store.settings.spug_push_key) return message.error('开启MFA认证需要先在推送服务设置中绑定推送助手账户');
    v ? setVisible(true) : handleMFAModify(false)
  }

  function handleCaptcha() {
    setLoading(true)
    http.get('/api/setting/mfa/')
      .then(() => setCounter(60))
      .finally(() => setLoading(false))
  }

  function handleMFAModify(v) {
    setLoading2(true)
    http.post('/api/setting/mfa/', {enable: v, code})
      .then(() => {
        setVisible(false);
        message.success('设置成功');
        store.fetchSettings()
      })
      .finally(() => setLoading2(false))
  }

  const {verify_ip, bind_ip, MFA} = store.settings;
  return (
    <Spin spinning={store.isFetching}>
      <div className={styles.title}>安全设置</div>
      <Form layout="vertical" style={{maxWidth: 500}}>
        <Form.Item
          label="访问IP校验"
          extra={<span>建议开启，校验是否获取了真实的访问者IP，防止因为增加的反向代理层导致基于IP的安全策略失效，当校验失败时会在登录时弹窗提醒。如果你在内网部署且仅在内网使用可以关闭该特性。<a
            href="https://spug.cc/docs/practice"
            target="_blank" rel="noopener noreferrer">为什么没有获取到真实IP？</a></span>}>
          <Switch
            checkedChildren="开启"
            unCheckedChildren="关闭"
            onChange={handleChangeVerifyIP}
            checked={verify_ip}/>
        </Form.Item>
        <Form.Item
          label="登录IP绑定"
          extra="强烈建议开启，当开启后会把登录凭证与IP进行绑定，当该登录凭证通过其他IP访问时将自动失效。如非必要，切勿关闭该特性！">
          <Switch
            checkedChildren="开启"
            unCheckedChildren="关闭"
            onChange={handleChangeBindIP}
            checked={bind_ip}/>
        </Form.Item>
        <Form.Item
          label="登录MFA（两步）认证"
          style={{marginTop: 24}}
          extra={visible ? '输入验证码，通过验证后开启。' :
            <span>建议开启，登录时额外使用验证码进行身份验证。开启前至少要确保管理员账户配置了MFA标识（账户管理/编辑），开启后未配置的账户将无法登录。<a
              target="_blank" rel="noopener noreferrer"
              href="https://push.spug.cc/guide/spug">配置手册</a></span>}>
          {visible ? (
            <div style={{display: 'flex', width: 490}}>
              <Form.Item noStyle extra="验证通过后开启MFA（两步验证）。">
                <Input placeholder="请输入验证码" onChange={e => setCode(e.target.value)}/>
              </Form.Item>
              {counter > 0 ? (
                <Button disabled style={{marginLeft: 8}}>{counter} 秒后重新获取</Button>
              ) : (
                <Button loading={loading} style={{marginLeft: 8}} onClick={handleCaptcha}>获取验证码</Button>
              )}
              <Space style={{marginLeft: 48}}>
                <Button onClick={() => setVisible(false)}>取消</Button>
                <Button type="primary" loading={loading2} onClick={() => handleMFAModify(true)}>确认</Button>
              </Space>
            </div>
          ) : (
            <Switch
              checkedChildren="开启"
              unCheckedChildren="关闭"
              onChange={handleChangeMFA}
              checked={MFA?.enable}/>
          )}
        </Form.Item>
      </Form>
    </Spin>
  )
})
