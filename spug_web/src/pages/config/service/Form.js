/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, message } from 'antd';
import http from 'libs/http';
import { t } from 'libs';
import store from './store';

export default observer(function () {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  function handleSubmit() {
    setLoading(true);
    const formData = form.getFieldsValue();
    formData['id'] = store.record.id;
    http.post('/api/config/service/', formData)
      .then(res => {
        message.success(t('操作成功'));
        store.formVisible = false;
        store.fetchRecords()
      }, () => setLoading(false))
  }

  return (
    <Modal
      open
      maskClosable={false}
      title={store.record.id ? t('编辑服务') : t('新建服务')}
      onCancel={() => store.formVisible = false}
      confirmLoading={loading}
      onOk={handleSubmit}>
      <Form form={form} initialValues={store.record} labelCol={{span: 6}} wrapperCol={{span: 14}}>
        <Form.Item required name="name" label={t('服务名称')} tooltip={t('服务可以理解为一些配置的集合。')}>
          <Input placeholder={t('请输入服务名称')}/>
        </Form.Item>
        <Form.Item required name="key" label={t('标识符')} tooltip={t('服务的唯一标识符，会作为生成配置的前缀。')}
                   extra={t('可以由字母、数字和下划线组成。')}>
          <Input placeholder={t('请输入唯一标识符')}/>
        </Form.Item>
        <Form.Item name="desc" label={t('备注信息')}>
          <Input.TextArea placeholder={t('请输入备注信息')}/>
        </Form.Item>
      </Form>
    </Modal>
  )
})