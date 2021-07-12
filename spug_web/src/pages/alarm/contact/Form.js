/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, message } from 'antd';
import http from 'libs/http';
import store from './store';

export default observer(function () {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  function handleSubmit() {
    setLoading(true);
    const formData = form.getFieldsValue();
    formData['id'] = store.record.id;
    http.post('/api/alarm/contact/', formData)
      .then(res => {
        message.success('操作成功');
        store.formVisible = false;
        store.fetchRecords()
      }, () => setLoading(false))
  }

  return (
    <Modal
      visible
      width={800}
      maskClosable={false}
      title={store.record.id ? '编辑联系人' : '新建联系人'}
      onCancel={() => store.formVisible = false}
      confirmLoading={loading}
      onOk={handleSubmit}>
      <Form form={form} initialValues={store.record} labelCol={{span: 6}} wrapperCol={{span: 14}}>
        <Form.Item required name="name" label="姓名">
          <Input placeholder="请输入联系人姓名"/>
        </Form.Item>
        <Form.Item name="phone" label="手机号">
          <Input placeholder="请输入手机号"/>
        </Form.Item>
        <Form.Item name="email" label="邮箱">
          <Input placeholder="请输入邮箱地址"/>
        </Form.Item>
        <Form.Item name="wx_token" label="微信Token" extra={
          <a target="_blank" rel="noopener noreferrer"
             href="https://spug.cc/docs/alarm-contact/">如何获取微信 Token ？</a>}>
          <Input placeholder="请输入微信token"/>
        </Form.Item>
        <Form.Item name="ding" label="钉钉" extra={<span>
            钉钉收不到通知？请参考
            <a target="_blank" rel="noopener noreferrer"
               href="https://spug.cc/docs/install-error/#%E9%92%89%E9%92%89%E6%94%B6%E4%B8%8D%E5%88%B0%E9%80%9A%E7%9F%A5%EF%BC%9F">官方文档</a>
          </span>}>
          <Input placeholder="请输入钉钉机器人完整地址"/>
        </Form.Item>
        <Form.Item name="qy_wx" label="企业微信">
          <Input placeholder="请输入企业微信机器人完整地址"/>
        </Form.Item>
      </Form>
    </Modal>
  )
})