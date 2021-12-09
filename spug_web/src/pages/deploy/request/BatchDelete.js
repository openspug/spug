/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, Select, Radio, DatePicker, Space, message } from 'antd';
import { http, includes } from 'libs';
import store from './store';
import appStore from '../app/store';
import envStore from 'pages/config/environment/store';

export default observer(function () {
  const [mode, setMode] = useState('expire')
  const [value, setValue] = useState()
  const [appId, setAppId] = useState()
  const [envId, setEnvId] = useState()
  const [loading, setLoading] = useState()

  useEffect(() => {
    if (Object.keys(appStore.records).length === 0) appStore.fetchRecords()
    if (envStore.records.length === 0) envStore.fetchRecords()
  }, [])

  function handleSubmit() {
    const formData = {mode, value};
    if (mode === 'deploy') {
      if (!appId || !envId) return message.error('请选择要删除的应用和环境')
      formData.value = `${appId},${envId}`
    } else if (mode === 'expire') {
      if (!value) return message.error('请选择截止日期')
      formData.value = value.format('YYYY-MM-DD')
    } else if (!value) {
      return message.error('请输入保留个数')
    }
    setLoading(true);
    http.delete('/api/deploy/request/', {params: formData})
      .then(res => {
        message.success(`删除 ${res} 条发布记录`);
        store.batchVisible = false;
        store.fetchRecords()
      }, () => setLoading(false))
  }

  function handleChange(e) {
    setMode(e.target.value)
    setValue()
  }

  return (
    <Modal
      visible
      width={400}
      maskClosable={false}
      title="批量删除发布申请"
      onCancel={() => store.batchVisible = false}
      confirmLoading={loading}
      onOk={handleSubmit}>
      <Form layout="vertical">
        <Form.Item label="删除方式 :">
          <Radio.Group value={mode} placeholder="请选择" style={{width: 280}} onChange={handleChange}>
            <Radio.Button value="expire">截止时间</Radio.Button>
            <Radio.Button value="count">保留记录</Radio.Button>
            <Radio.Button value="deploy">发布配置</Radio.Button>
          </Radio.Group>
        </Form.Item>
        {mode === 'expire' && (
          <Form.Item
            label="截止日期 :"
            extra={<div>将删除截止日期<span style={{color: 'red'}}>之前</span>的所有发布申请记录。</div>}>
            <DatePicker value={value} style={{width: 290}} onChange={setValue} placeholder="请选择截止日期"/>
          </Form.Item>
        )}
        {mode === 'count' && (
          <Form.Item label="保留记录 :" extra="每个应用每个环境仅保留最新的N条发布申请。">
            <Input value={value} style={{width: 290}} onChange={e => setValue(e.target.value)} placeholder="请输入保留个数"/>
          </Form.Item>
        )}
        {mode === 'deploy' && (
          <Form.Item label="发布配置 :" extra="删除指定应用环境下的发布申请记录。">
            <Space>
              <Select
                showSearch
                style={{width: 160}}
                value={appId}
                onChange={setAppId}
                filterOption={(i, o) => includes(o.children, i)}
                placeholder="请选择应用">
                {Object.values(appStore.records).map(item => (
                  <Select.Option key={item.id} value={item.id}>{item.name}</Select.Option>
                ))}
              </Select>
              <Select
                showSearch
                style={{width: 122}}
                value={envId}
                onChange={setEnvId}
                filterOption={(i, o) => includes(o.children, i)}
                placeholder="请选择环境">
                {envStore.records.map(item => (
                  <Select.Option key={item.id} value={item.id}>{item.name}</Select.Option>
                ))}
              </Select>
            </Space>
          </Form.Item>
        )}
      </Form>
    </Modal>
  )
})