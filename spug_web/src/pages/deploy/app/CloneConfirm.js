/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { Select, Form } from 'antd';
import envStore from 'pages/config/environment/store';
import { includes } from 'libs';
import store from './store';
import lds from 'lodash';

export default observer(function (props) {
  const [form] = Form.useForm()
  const [apps] = useState(Object.values(store.records))
  const [appId, setAppId] = useState()
  const [deploys, setDeploys] = useState([])

  useEffect(() => {
    if (appId) {
      props.onChange(null)
      form.setFieldsValue({env_id: undefined})
      store.loadDeploys(appId)
        .then(res => setDeploys(res))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId])

  function handleChange(deployId) {
    const deploy = lds.find(deploys, {id: deployId})
    props.onChange(deploy)
  }

  return (
    <Form form={form} layout="vertical" style={{marginTop: 24}}>
      <Form.Item required label="克隆的应用">
        <Select showSearch filterOption={(i, o) => includes(o.children, i)} placeholder="请选择要克隆的应用" onChange={setAppId}>
          {apps.map(item => (
            <Select.Option key={item.id} value={item.id}>{item.name}</Select.Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item required name="env_id" label="克隆的环境">
        <Select
          showSearch
          filterOption={(i, o) => includes(o.children, i)}
          placeholder="请选择要克隆的环境"
          disabled={deploys.length === 0}
          onChange={handleChange}>
          {deploys.map(item => (
            <Select.Option key={item.id} value={item.id}>{envStore.idMap[item.env_id]?.name}</Select.Option>
          ))}
        </Select>
      </Form.Item>
    </Form>
  )
})