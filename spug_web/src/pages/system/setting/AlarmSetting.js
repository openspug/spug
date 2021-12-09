/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { observer } from 'mobx-react';
import { Button, Form, Input, Radio, Space, message } from 'antd';
import styles from './index.module.css';
import { http } from 'libs';
import store from './store';

export default observer(function () {
  const [form] = Form.useForm();
  const setting = store.settings.mail_service || {};
  const [mode, setMode] = useState(setting.server === undefined ? '1' : '2');
  const [loading, setLoading] = useState(false);

  function handleEmailTest() {
    setLoading(true);
    const formData = form.getFieldsValue();
    http.post('/api/setting/email_test/', formData)
      .then(() => {
        message.success('邮件服务连接成功')
      }).finally(() => setLoading(false))
  }

  function _doSubmit(formData) {
    store.loading = true;
    http.post('/api/setting/', {data: formData})
      .then(() => {
        message.success('保存成功');
        store.fetchSettings()
      })
      .finally(() => store.loading = false)
  }

  function handleSubmit() {
    let formData = form.getFieldsValue();
    if (mode === '1') {
      formData = {}
    } else if (!formData.server || !formData.port || !formData.username || !formData.password) {
      return message.error('请完成邮件服务配置');
    }
    _doSubmit([{key: 'mail_service', value: formData}])
  }

  return (
    <React.Fragment>
      <div className={styles.title}>报警服务设置</div>
      <div style={{maxWidth: 340}}>
        <Form.Item label="邮件服务" labelCol={{span: 24}} style={{marginTop: 12}} extra="用于通过邮件方式发送报警信息">
          <Radio.Group
            value={mode}
            style={{marginBottom: 8}}
            buttonStyle="solid"
            onChange={e => setMode(e.target.value)}>
            <Radio.Button value="1">内置</Radio.Button>
            <Radio.Button value="2">自定义</Radio.Button>
          </Radio.Group>
          <div style={{marginTop: 12, display: mode === '1' ? 'none' : 'block'}}>
            <Form form={form} initialValues={setting} labelCol={{span: 7}} wrapperCol={{span: 17}}>
              <Form.Item required name="server" label="邮件服务器">
                <Input placeholder="例如：smtp.exmail.qq.com"/>
              </Form.Item>
              <Form.Item required name="port" label="端口">
                <Input placeholder="例如：465"/>
              </Form.Item>
              <Form.Item required name="username" label="邮箱账号">
                <Input placeholder="例如：dev@exmail.com"/>
              </Form.Item>
              <Form.Item required name="password" label="密码/授权码">
                <Input.Password placeholder="请输入对应的密码或授权码"/>
              </Form.Item>
              <Form.Item name="nickname" label="发件人昵称">
                <Input placeholder="请输入发件人昵称"/>
              </Form.Item>
            </Form>
          </div>
        </Form.Item>
        <Space style={{marginTop: 24}}>
          {mode !== '1' && <Button type="danger" loading={loading} onClick={handleEmailTest}>测试邮件服务</Button>}
          <Button type="primary" loading={store.loading} onClick={handleSubmit}>保存设置</Button>
        </Space>
      </div>
    </React.Fragment>
  )
})