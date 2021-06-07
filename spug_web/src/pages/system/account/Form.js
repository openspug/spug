/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Select, Input, message } from 'antd';
import http from 'libs/http';
import store from './store';
import roleStore from '../role/store';
import { Link } from "react-router-dom";

export default observer(function () {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (roleStore.records.length === 0) {
      roleStore.fetchRecords()
    }
  }, [])

  function handleSubmit() {
    setLoading(true);
    const formData = form.getFieldsValue();
    let request;
    if (store.record.id) {
      formData['id'] = store.record.id;
      request = http.patch('/api/account/user/', formData)
    } else {
      request = http.post('/api/account/user/', formData)
    }
    request.then(() => {
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
      title={store.record.id ? '编辑账户' : '新建账户'}
      onCancel={() => store.formVisible = false}
      confirmLoading={loading}
      onOk={handleSubmit}>
      <Form form={form} initialValues={store.record} labelCol={{span: 6}} wrapperCol={{span: 14}}>
        <Form.Item required name="username" label="登录名">
          <Input placeholder="请输入登录名"/>
        </Form.Item>
        <Form.Item required name="nickname" label="姓名">
          <Input placeholder="请输入姓名"/>
        </Form.Item>
        {store.record.id === undefined && (
          <Form.Item required name="password" label="密码">
            <Input type="password" placeholder="请输入密码"/>
          </Form.Item>
        )}
        <Form.Item required label="角色" style={{marginBottom: 0}}>
          <Form.Item name="role_id" style={{display: 'inline-block', width: '80%'}}>
            <Select placeholder="请选择">
              {roleStore.records.map(item => (
                <Select.Option value={item.id} key={item.id}>{item.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item style={{display: 'inline-block', width: '20%', textAlign: 'right'}}>
            <Link to="/system/role">新建角色</Link>
          </Form.Item>
        </Form.Item>
        <Form.Item name="wx_token" label="微信Token">
          <Input placeholder="请输入微信Token"/>
        </Form.Item>
      </Form>
    </Modal>
  )
})
