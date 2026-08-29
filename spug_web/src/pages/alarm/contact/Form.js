/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useMemo } from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, Tooltip, message } from 'antd';
import { ThunderboltOutlined, LoadingOutlined } from '@ant-design/icons';
import http from 'libs/http';
import { t } from 'libs';
import store from './store';

export default observer(function () {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState('0');

  // 后端把各渠道的加签密钥合并存在 secret 字段（JSON），表单里拆成独立输入框
  const secret = useMemo(() => {
    try {
      return store.record.secret ? JSON.parse(store.record.secret) : {};
    } catch (e) {
      return {};
    }
  }, []);

  function handleSubmit() {
    setLoading(true);
    const formData = form.getFieldsValue();
    formData['id'] = store.record.id;
    // 只有填了对应 webhook 才保留密钥，避免清空渠道后留下孤儿密钥
    const newSecret = {};
    if (formData.ding && formData.ding_secret) newSecret.ding = formData.ding_secret;
    if (formData.feishu && formData.feishu_secret) newSecret.feishu = formData.feishu_secret;
    delete formData.ding_secret;
    delete formData.feishu_secret;
    formData.secret = Object.keys(newSecret).length ? JSON.stringify(newSecret) : null;
    http.post('/api/alarm/contact/', formData)
      .then(res => {
        message.success(t('操作成功'));
        store.formVisible = false;
        store.fetchRecords()
      }, () => setLoading(false))
  }

  function handleTest(mode, name) {
    const value = form.getFieldValue(name)
    if (!value) return message.error(t('请输入后再执行测试'))
    const secretName = {ding: 'ding_secret', feishu: 'feishu_secret'}[name]
    const testSecret = secretName ? form.getFieldValue(secretName) : undefined
    setTestLoading(mode)
    http.post('/api/alarm/test/', {mode, value, secret: testSecret})
      .then(() => {
        message.success(t('执行成功'))
      })
      .finally(() => setTestLoading('0'))
  }

  function Test(props) {
    return (
      <div style={{position: 'absolute', right: -30, top: 8}}>
        {testLoading === props.mode ? (
          <LoadingOutlined style={{fontSize: 18, color: '#faad14'}}/>
        ) : (
          <Tooltip title={t('执行测试')}>
            <ThunderboltOutlined
              style={{fontSize: 18, color: '#faad14'}}
              onClick={() => handleTest(props.mode, props.name)}/>
          </Tooltip>
        )}
      </div>
    )
  }

  return (
    <Modal
      open
      width={800}
      maskClosable={false}
      title={store.record.id ? t('编辑联系人') : t('新建联系人')}
      onCancel={() => store.formVisible = false}
      confirmLoading={loading}
      onOk={handleSubmit}>
      <Form form={form} initialValues={{...store.record, ding_secret: secret.ding, feishu_secret: secret.feishu}}
            labelCol={{span: 6}} wrapperCol={{span: 14}}>
        <Form.Item required name="name" label={t('姓名')}>
          <Input placeholder={t('请输入联系人姓名')}/>
        </Form.Item>
        <Form.Item name="phone" label={t('手机号')}>
          <Input placeholder={t('请输入手机号')}/>
        </Form.Item>
        <Form.Item label={t('邮箱')}>
          <Form.Item noStyle name="email">
            <Input placeholder={t('请输入邮箱地址')}/>
          </Form.Item>
          <Test mode="4" name="email"/>
        </Form.Item>
        <Form.Item label={t('微信Token')} extra={
          <a target="_blank" rel="noopener noreferrer"
             href="https://spug.cc/docs/alarm-contact/">{t('如何获取微信 Token ？')}</a>}>
          <Form.Item noStyle name="wx_token">
            <Input placeholder={t('请输入微信token')}/>
          </Form.Item>
          <Test mode="1" name="wx_token"/>
        </Form.Item>
        <Form.Item label={t('钉钉')} extra={<span>
            {t('钉钉收不到通知？请参考')}
            <a target="_blank" rel="noopener noreferrer"
               href="https://spug.cc/docs/use-problem#use-dd">{t('官方文档')}</a>
          </span>}>
          <Form.Item noStyle name="ding">
            <Input placeholder="https://oapi.dingtalk.com/robot/send?access_token=xxx"/>
          </Form.Item>
          <Test mode="3" name="ding"/>
        </Form.Item>
        <Form.Item name="ding_secret" label={t('钉钉 Secret')}
                   extra={t('钉钉机器人安全设置选择「加签」时填写，未开启加签可留空。')}>
          <Input placeholder="SECxxxxxxxx"/>
        </Form.Item>
        <Form.Item label={t('企业微信')}>
          <Form.Item noStyle name="qy_wx">
            <Input placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"/>
          </Form.Item>
          <Test mode="5" name="qy_wx"/>
        </Form.Item>
        <Form.Item label={t('飞书')}>
          <Form.Item noStyle name="feishu">
            <Input placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxx"/>
          </Form.Item>
          <Test mode="7" name="feishu"/>
        </Form.Item>
        <Form.Item name="feishu_secret" label={t('飞书 Secret')}
                   extra={t('飞书机器人安全设置选择「签名校验」时填写，未开启可留空。')}>
          <Input placeholder="xxxxxxxx"/>
        </Form.Item>
      </Form>
    </Modal>
  )
})