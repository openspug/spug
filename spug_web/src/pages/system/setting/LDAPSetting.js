/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import styles from './index.module.css';
import { Form, Button, Input, Space, message } from 'antd';
import { http } from 'libs';
import { observer } from 'mobx-react'
import store from './store';

export default observer(function () {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  function handleSubmit() {
    store.loading = true;
    const formData = form.getFieldsValue();
    http.post('/api/setting/', {data: [{key: 'ldap_service', value: formData}]})
      .then(() => {
        message.success('保存成功');
        store.fetchSettings()
      })
      .finally(() => store.loading = false)
  }

  function ldapTest() {
    setLoading(true);
    const formData = form.getFieldsValue();
    http.post('/api/setting/ldap_test/', formData).then(() => {
      message.success('LDAP服务连接成功')
    }).finally(() => setLoading(false))
  }

  return (
    <React.Fragment>
      <div className={styles.title}>LDAP设置</div>
      <Form form={form} initialValues={store.settings.ldap_service} style={{maxWidth: 400}} labelCol={{span: 8}}
            wrapperCol={{span: 16}}>
        <Form.Item required name="server" label="LDAP服务地址">
          <Input placeholder="例如：ldap.spug.cc"/>
        </Form.Item>
        <Form.Item required name="port" label="LDAP服务端口">
          <Input placeholder="例如：389"/>
        </Form.Item>
        <Form.Item required name="admin_dn" label="管理员DN">
          <Input placeholder="例如：cn=admin,dc=spug,dc=dev"/>
        </Form.Item>
        <Form.Item required name="password" label="管理员密码">
          <Input.Password placeholder="请输入LDAP管理员密码"/>
        </Form.Item>
        <Form.Item required name="rules" label="LDAP搜索规则">
          <Input placeholder="例如：cn"/>
        </Form.Item>
        <Form.Item required name="base_dn" label="基本DN">
          <Input placeholder="例如：dc=spug,dc=dev"/>
        </Form.Item>
        <Space>
          <Button type="danger" loading={loading} onClick={ldapTest}>测试LDAP</Button>
          <Button type="primary" loading={store.loading} onClick={handleSubmit}>保存设置</Button>
        </Space>
      </Form>
    </React.Fragment>
  )
})