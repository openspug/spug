/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, Tooltip, message } from 'antd';
import { ThunderboltOutlined, LoadingOutlined } from '@ant-design/icons';
import http from 'libs/http';
import store from './store';

export default observer(function () {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState('0');

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

  function handleTest(mode, name) {
    const value = form.getFieldValue(name)
    if (!value) return message.error('请输入后再执行测试')
    setTestLoading(mode)
    http.post('/api/alarm/test/', {mode, value})
      .then(() => {
        message.success('执行成功')
      })
      .finally(() => setTestLoading('0'))
  }

  function Test(props) {
    return (
      <div style={{position: 'absolute', right: -30, top: 8}}>
        {testLoading === props.mode ? (
          <LoadingOutlined style={{fontSize: 18, color: '#faad14'}}/>
        ) : (
          <Tooltip title="执行测试">
            <ThunderboltOutlined
              style={{fontSize: 18, color: '#faad14'}}
              onClick={() => handleTest(props.mode, props.name)}/>
          </Tooltip>
        )}
      </div>
    )
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
        <Form.Item label="邮箱">
          <Form.Item noStyle name="email">
            <Input placeholder="请输入邮箱地址"/>
          </Form.Item>
          <Test mode="4" name="email"/>
        </Form.Item>
        <Form.Item label="钉钉" extra={<span>
            钉钉收不到通知？请参考
            <a target="_blank" rel="noopener noreferrer"
               href="https://spug.cc/docs/use-problem#use-dd">官方文档</a>
          </span>}>
          <Form.Item noStyle name="ding">
            <Input placeholder="https://oapi.dingtalk.com/robot/send?access_token=xxx"/>
          </Form.Item>
          <Test mode="3" name="ding"/>
        </Form.Item>
        <Form.Item label="企业微信">
          <Form.Item noStyle name="qy_wx">
            <Input placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"/>
          </Form.Item>
          <Test mode="5" name="qy_wx"/>
        </Form.Item>
      </Form>
    </Modal>
  )
})