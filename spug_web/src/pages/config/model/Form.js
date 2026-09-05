/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, InputNumber, Switch, Button, message } from 'antd';
import http from 'libs/http';
import { t } from 'libs';
import store from './store';

export default observer(function () {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  function handleSubmit() {
    setLoading(true);
    const formData = form.getFieldsValue();
    formData['id'] = store.record.id;
    http.post('/api/ai/model/', formData)
      .then(() => {
        message.success(t('操作成功'));
        store.formVisible = false;
        store.fetchRecords()
      }, () => setLoading(false))
  }

  function handleTest() {
    const formData = form.getFieldsValue();
    if (!formData.base_url || !formData.api_key || !formData.model) {
      return message.error(t('请先填写接口地址、API Key 和模型名称'))
    }
    setTesting(true);
    http.post('/api/ai/model/test/', formData, {timeout: 620000})
      .then(res => message.success(t('连接正常，返回：{}', res.content)))
      .finally(() => setTesting(false))
  }

  return (
    <Modal
      open
      width={640}
      maskClosable={false}
      title={store.record.id ? t('编辑模型配置') : t('新建模型配置')}
      onCancel={() => store.formVisible = false}
      footer={[
        <Button key="test" loading={testing} onClick={handleTest}>{t('连接测试')}</Button>,
        <Button key="cancel" onClick={() => store.formVisible = false}>{t('取消')}</Button>,
        <Button key="ok" type="primary" loading={loading} onClick={handleSubmit}>{t('确定')}</Button>,
      ]}>
      <Form form={form} initialValues={store.record} labelCol={{span: 6}} wrapperCol={{span: 16}}>
        <Form.Item required name="name" label={t('配置名称')}>
          <Input placeholder={t('请输入配置名称')}/>
        </Form.Item>
        <Form.Item required name="base_url" label={t('接口地址')}
                   tooltip={t('OpenAI 协议兼容地址，无需包含 /chat/completions')}
                   extra={t('例如：https://api.openai.com/v1')}>
          <Input placeholder="https://api.openai.com/v1"/>
        </Form.Item>
        <Form.Item required name="api_key" label="API Key">
          <Input.Password autoComplete="new-password" visibilityToggle placeholder={t('请输入API Key')}/>
        </Form.Item>
        <Form.Item required name="model" label={t('模型名称')} extra={t('例如：gpt-4o、qwen-max、deepseek-chat')}>
          <Input placeholder={t('请输入模型名称')}/>
        </Form.Item>
        <Form.Item name="timeout" initialValue={store.record.timeout || 600} label={t('调用超时')}
                   tooltip={t('单次调用最长等待时间')}>
          <InputNumber min={30} max={3600} style={{width: 160}} addonAfter={t('秒')}/>
        </Form.Item>
        <Form.Item name="temperature" initialValue={store.record.temperature === undefined ? 0.2 : store.record.temperature}
                   label={t('温度')} tooltip={t('值越低回复越稳定，运维场景建议 0-0.3')}>
          <InputNumber min={0} max={2} step={0.1} style={{width: 160}}/>
        </Form.Item>
        <Form.Item name="sort_id" initialValue={store.record.sort_id || 0} label={t('备选优先级')}
                   tooltip={t('主模型失败后，按该值从大到小依次降级调用')}>
          <InputNumber min={0} max={999} style={{width: 160}}/>
        </Form.Item>
        <Form.Item name="is_default" valuePropName="checked"
                   initialValue={store.record.is_default || false} label={t('设为主模型')}
                   extra={t('主模型全局唯一，其余启用中的配置将自动作为备选模型。')}>
          <Switch/>
        </Form.Item>
        <Form.Item name="is_active" valuePropName="checked"
                   initialValue={store.record.is_active === undefined ? true : store.record.is_active}
                   label={t('启用')}>
          <Switch/>
        </Form.Item>
        <Form.Item name="desc" label={t('备注信息')}>
          <Input.TextArea placeholder={t('请输入备注信息')}/>
        </Form.Item>
      </Form>
    </Modal>
  )
})
