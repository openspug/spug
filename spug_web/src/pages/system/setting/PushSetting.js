/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react';
import { Form, Input, Button, Space, Spin, Popconfirm, Statistic, Row, Col, Card, message } from 'antd';
import styles from './index.module.css';
import { http, t } from 'libs';
import store from './store';

export default observer(function () {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [balance, setBalance] = useState({});
  const [pushKey, setPushKey] = useState(store.settings.spug_push_key);

  useEffect(() => {
    if (store.settings.spug_push_key) {
      fetchBalance()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fetchBalance() {
    setFetching(true)
    http.get('/api/setting/push/balance/')
      .then(res => setBalance(res || {}))
      .finally(() => setFetching(false))
  }

  function handleBind() {
    if (!pushKey) return message.error(t('请输入要绑定的推送助手用户ID'));
    setLoading(true);
    http.post('/api/setting/push/bind/', {spug_push_key: pushKey})
      .then(res => {
        message.success(t('绑定成功'));
        store.fetchSettings();
        setBalance(res || {})
      })
      .finally(() => setLoading(false))
  }

  function handleUnbind() {
    // 3.0 里这里挡了一道「先关闭MFA」，因为 3.0 的 MFA 验证码走推送助手；
    // 4.0 的 MFA 走 libs/spug.py 的 spug_key（api.spug.cc），与推送助手无关，故不再拦截。
    setLoading(true);
    http.post('/api/setting/push/bind/', {spug_push_key: ''})
      .then(() => {
        message.success(t('解绑成功'));
        store.fetchSettings();
        setBalance({});
        setPushKey('')
      })
      .finally(() => setLoading(false))
  }

  const spugPushKey = store.settings.spug_push_key;
  return (
    <Spin spinning={fetching}>
      <div className={styles.title}>{t('推送服务设置')}</div>
      <div style={{maxWidth: 420}}>
        <Form.Item
          label={t('推送助手账户绑定')}
          labelCol={{span: 24}}
          style={{marginTop: 12}}
          extra={<span>
            {t('请登录推送助手，至个人中心 / 个人设置查看用户ID，注意保密该ID请勿泄漏给第三方。')}
            <a target="_blank" rel="noopener noreferrer" href="https://push.spug.cc/guide/spug">{t('配置手册')}</a>
          </span>}>
          {spugPushKey ? (
            <Space.Compact style={{width: '100%'}}>
              <Input readOnly value={spugPushKey} className={styles.keyText} style={{fontWeight: 'bold'}}/>
              <Popconfirm title={t('确定要解除绑定？')} onConfirm={handleUnbind}>
                <Button ghost danger loading={loading}>{t('解绑')}</Button>
              </Popconfirm>
            </Space.Compact>
          ) : (
            <Space.Compact style={{width: '100%'}}>
              <Input
                value={pushKey}
                onChange={e => setPushKey(e.target.value)}
                placeholder={t('请输入要绑定的推送助手用户ID')}/>
              <Button type="primary" loading={loading} onClick={handleBind}>{t('确定')}</Button>
            </Space.Compact>
          )}
        </Form.Item>
      </div>

      {spugPushKey && balance.vip_desc ? (
        <Card
          size="small"
          style={{marginTop: 24, maxWidth: 620}}
          title={balance.vip_desc}
          extra={<a target="_blank" rel="noopener noreferrer" href="https://push.spug.cc/buy/sms">{t('充值')}</a>}>
          <Row gutter={16}>
            <Col span={6}><Statistic title={t('短信余额')} value={balance.sms_balance ?? '-'}/></Col>
            <Col span={6}><Statistic title={t('语音余额')} value={balance.voice_balance ?? '-'}/></Col>
            <Col span={6}><Statistic title={t('邮件余额')} value={balance.mail_balance ?? '-'}/></Col>
            <Col span={6}><Statistic title={t('微信公众号余额')} value={balance.wx_mp_balance ?? '-'}/></Col>
          </Row>
        </Card>
      ) : null}
    </Spin>
  )
})
