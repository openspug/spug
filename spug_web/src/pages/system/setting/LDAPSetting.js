/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import styles from './index.module.css';
import { Form, Button, Input, Space, message, Modal } from 'antd';
import { http } from 'libs';
import LdapImport from './LdapImport';
import { observer } from 'mobx-react'
import store from './store';

export default observer(function () {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  function handleSubmit() {
    store.loading = true;
    const formData = form.getFieldsValue();
    http.post('/api/setting/', { data: [{ key: 'ldap_service', value: formData }] })
      .then(() => {
        message.success('保存成功');
        store.fetchSettings()
      })
      .finally(() => store.loading = false)
  }

  function ldapTest() {
    setLoading(true);
    const formData = form.getFieldsValue();
    http.post('/api/setting/ldap_test/', formData).then((res) => {
      message.success("成功匹配" + res.length + "个用户")
    }).finally(() => setLoading(false))
  }


  function ldapLogin(info) {
    let ldadUser;
    let ldadPwd;
    Modal.confirm({
      title: 'LDAP用户测试登录',
      content: <Form layout="vertical" style={{marginTop: 24}}>
        <Form.Item required label="LDAP登录名">
          <Input onChange={val => ldadUser = val.target.value }/>
        </Form.Item>
        <Form.Item required label="LDAP用户密码" >
          <Input.Password onChange={val => ldadPwd = val.target.value}/>
        </Form.Item>
      </Form>,
      onOk: () => {
        setLoading(true);
        const formData = form.getFieldsValue();
        formData.ldap_user = ldadUser;
        formData.ldap_password = ldadPwd;
        return http.post('/api/setting/ldap/', formData)
          .then(() => message.success('登录成功', 1)).finally(() => setLoading(false))
      },
    })
  };


  return (
    <React.Fragment>
      <div className={styles.title}>LDAP设置</div>
      <Form form={form} initialValues={store.settings.ldap_service} style={{ maxWidth: 400 }} labelCol={{ span: 8 }}
        wrapperCol={{ span: 16 }}>
        <Form.Item required name="server" label="LDAP服务地址"  >
          <Input placeholder="例如：ldap://127.0.0.1:389" />
        </Form.Item>

        <Form.Item required name="admin_dn" label="绑定DN"  >
          <Input placeholder="例如：cn=admin,dc=spug,dc=cc" />
        </Form.Item>
        <Form.Item required name="admin_password" label="密码">
          <Input.Password placeholder="LDAP管理密码" />
        </Form.Item>

        <Form.Item required name="user_ou" label="用户OU">
          <Input placeholder="例如：ou=users,dc=spug,dc=cc" />
        </Form.Item>

        <Form.Item required name="user_filter" label="用户过滤器">
          <Input placeholder="例如：(cn或uid或sAMAccountName=%(user)s)" value="(cn=%(user)s)" />
        </Form.Item>
        {/* <Form.Item required name="user_map" label="用户属性映射" extra="用户属性映射代表怎样将LDAP中用户属性映射到Spug用户上，username, nickname 是Spug的用户需要属性">
          <Input.TextArea row={4} placeholder="例如：" />
        </Form.Item> */}

        <Form.Item required name="map_username" label="登录名映射" extra="登录名映射代表将LDAP用户的某个属性映射到Spug账户的登录名中，例如cn对应登录名">
          <Input placeholder="例如：cn" />
        </Form.Item>
        <Form.Item required name="map_nickname" label="姓名映射" extra="姓名映射代表将LDAP用户的某个属性映射到Spug账户的姓名中，例如sn对应姓名">
          <Input placeholder="例如：sn" />
        </Form.Item>
        <Space>
          <Button loading={loading} onClick={ldapTest}>测试连接</Button>
          <Button loading={loading} onClick={ldapLogin}>测试登录</Button>
          <Button loading={loading} onClick={store.handleLdapImport}>用户导入</Button>
          <Button type="primary" loading={store.loading} onClick={handleSubmit}>保存设置</Button>
        </Space>
      </Form>
      {store.importVisible && <LdapImport />}
    </React.Fragment> 
  )
})