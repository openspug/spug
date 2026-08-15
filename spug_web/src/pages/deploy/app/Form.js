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
    http.post('/api/app/', formData)
      .then(res => {
        message.success(t('操作成功'));
        store.formVisible = false;
        store.fetchRecords()
      }, () => setLoading(false))
  }

  return (
    <Modal
      visible
      maskClosable={false}
      title={store.record.id ? t('编辑应用') : t('新建应用')}
      onCancel={() => store.formVisible = false}
      confirmLoading={loading}
      onOk={handleSubmit}>
      <Form form={form} initialValues={store.record} labelCol={{span: 6}} wrapperCol={{span: 14}}>
        <Form.Item required name="name" label={t('应用名称')}>
          <Input placeholder={t('请输入应用名称，例如：订单服务')}/>
        </Form.Item>
        <Form.Item
          required
          name="key"
          label={t('唯一标识符')}
          tooltip={t('给应用设置的唯一标识符，会用于配置中心的配置生成。')}
          extra={t('可以由字母、数字和下划线组成。')}>
          <Input placeholder={t('请输入唯一标识符，例如：api_order')}/>
        </Form.Item>
        <Form.Item name="desc" label={t('备注信息')}>
          <Input.TextArea placeholder={t('请输入备注信息')}/>
        </Form.Item>
      </Form>
    </Modal>
  )
})