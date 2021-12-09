/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Form, Alert, Button, Input, Modal, message } from 'antd';
import styles from './index.module.css';
import http from 'libs/http';
import store from './store';

export default observer(function () {
  function handleSubmit() {
    Modal.confirm({
      title: '密钥修改确认',
      content: <span style={{color: '#f5222d'}}>请谨慎修改密钥对，修改密钥对可能会让现有的主机都无法进行验证，影响与主机相关的各项功能！</span>,
      onOk: () => {
        Modal.confirm({
          title: '小提示',
          content: <div>修改密钥对需要<span style={{color: '#f5222d'}}>重启服务后生效</span>，已添加的主机可能需要重新进行编辑验证后才可以正常连接。</div>,
          onOk: doModify
        })
      }
    })
  }

  function doModify() {
    return http.post('/api/setting/', {
      data: [
        {key: 'public_key', value: store.settings.public_key},
        {key: 'private_key', value: store.settings.private_key}
      ]
    })
      .then(() => {
        message.success('保存成功');
        store.fetchSettings()
      })
      .finally(() => store.loading = false)
  }

  return (
    <React.Fragment>
      <div className={styles.title}>密钥设置</div>
      <Alert
        closable
        showIcon
        type="info"
        style={{width: 650}}
        message="小提示"
        description="在这里你可以上传并使用已有的密钥对，没有上传密钥的情况下，Spug会在首次添加主机时自动生成密钥对。"
      />
      <Form layout="vertical" style={{maxWidth: 650, marginTop: 12}}>
        <Form.Item label="公钥" extra="一般位于 ~/.ssh/id_rsa.pub">
          <Input.TextArea
            rows={7}
            spellCheck={false}
            value={store.settings.public_key}
            onChange={e => store.settings.public_key = e.target.value}
            placeholder="请输入公钥"/>
        </Form.Item>
        <Form.Item label="私钥" extra="一般位于 ~/.ssh/id_rsa" style={{marginTop: 12}}>
          <Input.TextArea
            rows={14}
            spellCheck={false}
            value={store.settings.private_key}
            onChange={e => store.settings.private_key = e.target.value}
            placeholder="请输入私钥"/>
        </Form.Item>
        <Form.Item style={{marginTop: 24}}>
          <Button type="primary" loading={store.loading} onClick={handleSubmit}>保存设置</Button>
        </Form.Item>
      </Form>
    </React.Fragment>
  )
})
