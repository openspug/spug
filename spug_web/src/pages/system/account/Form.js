/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { observer } from 'mobx-react';
import { Modal, Form, Select, Input, message } from 'antd';
import http from 'libs/http';
import { t } from 'libs';
import store from './store';
import rStore from '../role/store';


export default observer(function () {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  function handleSubmit() {
    setLoading(true);
    const formData = form.getFieldsValue();
    formData.id = store.record.id;
    http.post('/api/account/user/', formData)
      .then(() => {
        message.success(t('操作成功'));
        store.formVisible = false;
        store.fetchRecords()
      }, () => setLoading(false))
  }

  return (
    <Modal
      visible
      width={700}
      maskClosable={false}
      title={store.record.id ? t('编辑账户') : t('新建账户')}
      onCancel={() => store.formVisible = false}
      confirmLoading={loading}
      onOk={handleSubmit}>
      <Form form={form} initialValues={store.record} labelCol={{span: 6}} wrapperCol={{span: 14}}>
        <Form.Item required name="username" label={t('登录名')}>
          <Input placeholder={t('请输入登录名')}/>
        </Form.Item>
        <Form.Item required name="nickname" label={t('姓名')}>
          <Input placeholder={t('请输入姓名')}/>
        </Form.Item>
        <Form.Item required hidden={store.record.id} name="password" label={t('密码')} extra={t('至少8位包含数字、小写和大写字母。')}>
          <Input.Password placeholder={t('请输入密码')}/>
        </Form.Item>
        <Form.Item hidden={store.record.is_supper} label={t('角色')} style={{marginBottom: 0}}>
          <Form.Item name="role_ids" style={{display: 'inline-block', width: '80%'}} extra={t('权限最大化原则，组合多个角色权限。')}>
            <Select mode="multiple" placeholder={t('请选择')}>
              {rStore.records.map(item => (
                <Select.Option value={item.id} key={item.id}>{item.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item style={{display: 'inline-block', width: '20%', textAlign: 'right'}}>
            <Link to="/system/role">{t('新建角色')}</Link>
          </Form.Item>
        </Form.Item>
        <Form.Item
          name="wx_token"
          label={t('微信Token')}
          extra={(
            <span>
              {t('如果启用了MFA（两步验证）则该项为必填。')}
              <a target="_blank" rel="noopener noreferrer" href="https://spug.cc/docs/wx-token/">{t('什么是微信Token？')}</a>
            </span>)}>
          <Input placeholder={t('请输入微信Token')}/>
        </Form.Item>
      </Form>
    </Modal>
  )
})
