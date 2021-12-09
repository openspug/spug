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
    formData.id = store.record.id;
    http.post('/api/account/user/', formData)
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
        <Form.Item required hidden={store.record.id} name="password" label="密码">
          <Input type="password" placeholder="请输入密码"/>
        </Form.Item>
        <Form.Item hidden={store.record.is_supper} label="角色" style={{marginBottom: 0}}>
          <Form.Item name="role_ids" style={{display: 'inline-block', width: '80%'}} extra="权限最大化原则，组合多个角色权限。">
            <Select mode="multiple" placeholder="请选择">
              {roleStore.records.map(item => (
                <Select.Option value={item.id} key={item.id}>{item.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item style={{display: 'inline-block', width: '20%', textAlign: 'right'}}>
            <Link to="/system/role">新建角色</Link>
          </Form.Item>
        </Form.Item>
        <Form.Item
          name="wx_token"
          label="微信Token"
          extra={(
            <span>
              如果启用了MFA（两步验证）则该项为必填。
              <a target="_blank" rel="noopener noreferrer" href="https://spug.cc/docs/wx-token/">什么是微信Token？</a>
            </span>)}>
          <Input placeholder="请输入微信Token"/>
        </Form.Item>
      </Form>
    </Modal>
  )
})
