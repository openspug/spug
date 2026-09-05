/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, Switch, message } from 'antd';
import http from 'libs/http';
import { t } from 'libs';
import store from './store';

export default observer(function () {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  function handleSubmit() {
    setLoading(true);
    const formData = form.getFieldsValue();
    formData['id'] = store.skillRecord.id;
    http.post('/api/ai/skill/', formData)
      .then(() => {
        message.success(t('操作成功'));
        store.skillFormVisible = false;
        store.fetchSkillRecords()
      }, () => setLoading(false))
  }

  return (
    <Modal
      open
      width={760}
      maskClosable={false}
      title={store.skillRecord.id ? t('编辑技能') : t('新建技能')}
      onCancel={() => store.skillFormVisible = false}
      confirmLoading={loading}
      onOk={handleSubmit}>
      <Form form={form} initialValues={store.skillRecord} labelCol={{span: 4}} wrapperCol={{span: 19}}>
        <Form.Item required name="name" label={t('技能名称')}>
          <Input placeholder={t('例如：Nginx 故障排查')}/>
        </Form.Item>
        <Form.Item required name="description" label={t('用途说明')}
                   tooltip={t('会注入智能体提示词，供模型判断何时加载该技能')}>
          <Input placeholder={t('一句话说明该技能适用的场景')}/>
        </Form.Item>
        <Form.Item required name="content" label={t('技能内容')}
                   tooltip={t('Markdown 格式的操作手册/知识，模型按需加载完整内容')}>
          <Input.TextArea rows={14} placeholder={t('请输入技能内容（Markdown）')}/>
        </Form.Item>
        <Form.Item name="is_active" valuePropName="checked"
                   initialValue={store.skillRecord.is_active === undefined ? true : store.skillRecord.is_active}
                   label={t('启用')}>
          <Switch/>
        </Form.Item>
      </Form>
    </Modal>
  )
})
