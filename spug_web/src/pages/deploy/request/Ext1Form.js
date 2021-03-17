/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, Select, message, Button } from 'antd';
import HostSelector from './HostSelector';
import hostStore from 'pages/host/store';
import http from 'libs/http';
import store from './store';
import lds from 'lodash';
import moment from 'moment';

export default observer(function () {
  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState([]);
  const [host_ids, setHostIds] = useState([]);

  useEffect(() => {
    const {deploy_id, app_host_ids, host_ids} = store.record;
    setHostIds(lds.clone(host_ids || app_host_ids));
    http.get('/api/repository/', {params: {deploy_id}})
      .then(res => setVersions(res))
    if (hostStore.records.length === 0) hostStore.fetchRecords()
  }, [])

  function handleSubmit() {
    if (host_ids.length === 0) {
      return message.error('请至少选择一个要发布的主机')
    }
    setLoading(true);
    const formData = form.getFieldsValue();
    formData['id'] = store.record.id;
    formData['host_ids'] = host_ids;
    formData['type'] = store.record.type;
    formData['deploy_id'] = store.record.deploy_id;
    http.post('/api/deploy/request/1/', formData)
      .then(res => {
        message.success('操作成功');
        store.ext1Visible = false;
        store.fetchRecords()
      }, () => setLoading(false))
  }

  const {app_host_ids, type, rb_id,} = store.record;
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
        <Form.Item required name="repository_id" label={type === '2' ? '回滚版本' : '发布版本'}>
          <Select placeholder="请选择">
            {versions.map(item => (
              <Select.Option key={item.id} value={item.id} disabled={type === '2' && item.id >= rb_id}>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span>{item.remarks ? `${item.version} (${item.remarks})` : item.version}</span>
                  <span style={{color: '#999', fontSize: 12}}>构建于 {moment(item.created_at).fromNow()}</span>
                </div>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item required label="目标主机" help="可以通过创建多个发布申请单，选择主机分批发布。">
          {host_ids.length > 0 && `已选择 ${host_ids.length} 台`}
          <Button type="link" onClick={() => setVisible(true)}>选择主机</Button>
        </Form.Item>
        <Form.Item name="desc" label="备注信息">
          <Input placeholder="请输入备注信息"/>
        </Form.Item>
      </Form>
      {visible && <HostSelector
        host_ids={host_ids}
        app_host_ids={app_host_ids}
        onCancel={() => setVisible(false)}
        onOk={ids => setHostIds(ids)}/>}
    </Modal>
  )
})