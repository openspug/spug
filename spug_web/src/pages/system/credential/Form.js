/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Select, Input, Switch, message } from 'antd';
import http from 'libs/http';
import store from './store';

export default observer(function () {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  function handleSubmit() {
    setLoading(true);
    const formData = form.getFieldsValue();
    formData.id = store.record.id;
    http.post('/api/credential/', formData)
      .then(() => {
        message.success('操作成功');
        store.formVisible = false;
        store.fetchRecords()
      }, () => setLoading(false))
  }

  return (
    <Modal
      visible
      width={700}
      maskClosable={false}
      title={store.record.id ? '编辑凭证' : '新建凭证'}
      onCancel={() => store.formVisible = false}
      confirmLoading={loading}
      onOk={handleSubmit}>
      <Form form={form} initialValues={store.record} labelCol={{span: 6}} wrapperCol={{span: 14}}>
        <Form.Item required name="type" label="凭证类型" initialValue="pw">
          <Select placeholder="请选择">
            <Select.Option value="pw">密码</Select.Option>
            <Select.Option value="pk">密钥</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item required name="name" label="凭证名称">
          <Input placeholder="请输入凭证名称"/>
        </Form.Item>
        <Form.Item required name="username" label="用户名">
          <Input placeholder="请输入用户名"/>
        </Form.Item>
        <Form.Item noStyle shouldUpdate>
          {({getFieldValue}) =>
            getFieldValue('type') === 'pw' ? (
              <Form.Item required name="secret" label="密码">
                <Input placeholder="请输入密码"/>
              </Form.Item>
            ) : (
              <React.Fragment>
                <Form.Item required name="secret" label="私钥">
                  <Input.TextArea placeholder="请输入私钥内容"/>
                </Form.Item>
                <Form.Item name="extra" label="私钥密码">
                  <Input placeholder="请输入私钥密码"/>
                </Form.Item>
              </React.Fragment>
            )
          }
        </Form.Item>
        <Form.Item name="is_public" valuePropName="checked" label="共享凭据" tooltip="启用后凭据可以被其它用户使用。"
                   initialValue={false}>
          <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
        </Form.Item>
      </Form>
    </Modal>
  )
})
