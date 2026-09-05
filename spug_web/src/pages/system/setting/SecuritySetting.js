/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { Form, Switch, Input, Space, message, Button } from 'antd';
import styles from './index.module.css';
import http from 'libs/http';
import { t } from 'libs';
import store from './store';

export default observer(function () {
  const [verify_ip, setVerifyIP] = useState(store.settings.verify_ip);
  const [bind_ip, setBindIP] = useState(store.settings.bind_ip);
  const [mfa, setMFA] = useState(store.settings.MFA || {});
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
    setVerifyIP(v);
    http.post('/api/setting/', {data: [{key: 'verify_ip', value: v}]})
      .then(() => {
        message.success(t('设置成功'));
        store.fetchSettings()
      })
  }

  function handleChangeBindIP(v) {
    setBindIP(v);
    http.post('/api/setting/', {data: [{key: 'bind_ip', value: v}]})
      .then(() => {
        message.success(t('设置成功'));
        store.fetchSettings()
      })
  }

  function handleChangeMFA(v) {
    if (v && !store.settings.spug_push_key) return message.error(t('开启MFA认证需要先在推送服务设置中绑定推送助手账户'));
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
        setMFA({enable: v});
        setVisible(false);
        message.success(t('设置成功'));
        store.fetchSettings()
      })
      .finally(() => setLoading2(false))
  }

  return (
    <React.Fragment>
      <div className={styles.title}>{t('安全设置')}</div>
      <Form layout="vertical" style={{maxWidth: 500}}>
        <Form.Item
          label={t('访问IP校验')}
          extra={<span>{t('建议开启，校验是否获取了真实的访问者IP，防止因为增加的反向代理层导致基于IP的安全策略失效，当校验失败时会在登录时弹窗提醒。如果你在内网部署且仅在内网使用可以关闭该特性。')}<a
            href="https://spug.cc/docs/practice"
            target="_blank" rel="noopener noreferrer">{t('为什么没有获取到真实IP？')}</a></span>}>
          <Switch
            checkedChildren={t('开启')}
            unCheckedChildren={t('关闭')}
            onChange={handleChangeVerifyIP}
            checked={verify_ip}/>
        </Form.Item>
        <Form.Item
          label={t('登录IP绑定')}
          extra={t('强烈建议开启，当开启后会把登录凭证与IP进行绑定，当该登录凭证通过其他IP访问时将自动失效。如非必要，切勿关闭该特性！')}>
          <Switch
            checkedChildren={t('开启')}
            unCheckedChildren={t('关闭')}
            onChange={handleChangeBindIP}
            checked={bind_ip}/>
        </Form.Item>
        <Form.Item
          label={t('登录MFA（两步）认证')}
          style={{marginTop: 24}}
          extra={visible ? t('输入验证码，通过验证后开启。') :
            <span>{t('建议开启，登录时额外使用验证码进行身份验证。验证码通过推送助手下发，开启前需先在推送服务设置中绑定账户，并确保管理员账户配置了推送对象ID（账户管理/编辑），开启后未配置的账户将无法登录，')}<a
              target="_blank" rel="noopener noreferrer" href="https://push.spug.cc/guide/spug">{t('配置手册')}</a></span>}>
          {visible ? (
            <div style={{display: 'flex', width: 490}}>
              <Form.Item noStyle extra={t('验证通过后开启MFA（两步验证）。')}>
                <Input placeholder={t('请输入验证码')} onChange={e => setCode(e.target.value)}/>
              </Form.Item>
              {counter > 0 ? (
                <Button disabled style={{marginLeft: 8}}>{t('{} 秒后重新获取', counter)}</Button>
              ) : (
                <Button loading={loading} style={{marginLeft: 8}} onClick={handleCaptcha}>{t('获取验证码')}</Button>
              )}
              <Space style={{marginLeft: 48}}>
                <Button onClick={() => setVisible(false)}>{t('取消')}</Button>
                <Button type="primary" loading={loading2} onClick={() => handleMFAModify(true)}>{t('确认')}</Button>
              </Space>
            </div>
          ) : (
            <Switch
              checkedChildren={t('开启')}
              unCheckedChildren={t('关闭')}
              onChange={handleChangeMFA}
              checked={mfa.enable}/>
          )}
        </Form.Item>
      </Form>
    </React.Fragment>
  )
})
