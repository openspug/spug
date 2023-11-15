/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { Button, Form, Input, Spin, message } from 'antd';
import styles from './index.module.css';
import { http } from 'libs';
import store from './store';


export default observer(function Basic(props) {
  const [form] = Form.useForm()
  const [fetching, setFetching] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!store.user.nickname) {
      setFetching(true)
      store.fetchUser()
        .then(() => form.setFieldsValue(store.user))
        .finally(() => setFetching(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSubmit() {
    setLoading(true);
    const formData = form.getFieldsValue();
    http.patch('/api/account/self/', formData)
      .then(() => {
        message.success('保存成功，昵称将在重新登录或刷新页面后生效');
        localStorage.setItem('nickname', formData.nickname);
        store.fetchUser()
      })
      .finally(() => setLoading(false))
  }

  return (
    <Spin spinning={fetching}>
      <div className={styles.title}>基本设置</div>
      <Form form={form} layout="vertical" style={{maxWidth: 320}} initialValues={store.user}>
        <Form.Item required name="nickname" label="昵称">
          <Input placeholder="请输入"/>
        </Form.Item>
        <Form.Item>
          <Button type="primary" loading={loading} onClick={handleSubmit}>保存设置</Button>
        </Form.Item>
      </Form>
    </Spin>
  )
})
