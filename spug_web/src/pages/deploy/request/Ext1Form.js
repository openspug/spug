/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, Select, Tag, message } from 'antd';
import hostStore from 'pages/host/store';
import http from 'libs/http';
import store from './store';
import lds from 'lodash';

export default observer(function () {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState([]);
  const [host_ids, setHostIds] = useState([]);

  useEffect(() => {
    const {deploy_id, app_host_ids, host_ids} = store.record;
    setHostIds(lds.clone(host_ids || app_host_ids));
    http.get('/api/repository/', {params: {deploy_id}})
      .then(res => setVersions(res))
    if (hostStore.records.length === 0) {
      hostStore.fetchRecords()
    }
  }, [])

  function handleSubmit() {
    if (host_ids.length === 0) {
      return message.error('请至少选择一个要发布的主机')
    }
    setLoading(true);
    const formData = form.getFieldsValue();
    formData['id'] = store.record.id;
    formData['host_ids'] = host_ids;
    formData['deploy_id'] = store.record.deploy_id;
    http.post('/api/deploy/request/1/', formData)
      .then(res => {
        message.success('操作成功');
        store.ext1Visible = false;
        store.fetchRecords()
      }, () => setLoading(false))
  }

  function handleChange(id) {
    const index = host_ids.indexOf(id);
    if (index === -1) {
      setHostIds([id, ...host_ids])
    } else {
      const tmp = lds.clone(host_ids);
      tmp.splice(index, 1);
      setHostIds(tmp)
    }
  }

  return (
    <Modal
      visible
      width={600}
      maskClosable={false}
      title="新建发布申请"
      onCancel={() => store.ext1Visible = false}
      confirmLoading={loading}
      onOk={handleSubmit}>
      <Form form={form} initialValues={store.record} labelCol={{span: 5}} wrapperCol={{span: 17}}>
        <Form.Item required name="name" label="申请标题">
          <Input placeholder="请输入申请标题"/>
        </Form.Item>
        <Form.Item required name="repository_id" label="发布版本">
          <Select placeholder="请选择">
            {versions.map(item => (
              <Select.Option
                key={item.id}
                value={item.id}>
                {item.remarks ? `${item.version} (${item.remarks})` : item.version}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="desc" label="备注信息">
          <Input placeholder="请输入备注信息"/>
        </Form.Item>
        <Form.Item required label="发布主机" help="通过点击主机名称自由选择本次发布的主机。">
          {store.record.app_host_ids.map(id => (
            <Tag.CheckableTag key={id} checked={host_ids.includes(id)} onChange={() => handleChange(id)}>
              {lds.get(hostStore.idMap, `${id}.name`)}({lds.get(hostStore.idMap, `${id}.hostname`)}:{lds.get(hostStore.idMap, `${id}.port`)})
            </Tag.CheckableTag>
          ))}
        </Form.Item>
      </Form>
    </Modal>
  )
})