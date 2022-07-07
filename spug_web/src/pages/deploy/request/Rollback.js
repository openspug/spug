/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, Select, Button, message } from 'antd';
import HostSelector from './HostSelector';
import { http, includes } from 'libs';
import store from './store';
import lds from 'lodash';
import moment from 'moment';

export default observer(function () {
  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [host_ids, setHostIds] = useState([]);

  useEffect(() => {
    const {app_host_ids, host_ids} = store.record;
    setHostIds(lds.clone(host_ids || app_host_ids));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSubmit() {
    if (host_ids.length === 0) {
      return message.error('请至少选择一个要发布的主机')
    }
    setLoading(true);
    const formData = form.getFieldsValue();
    formData['host_ids'] = host_ids;
    http.post('/api/deploy/request/ext1/rollback/', formData)
      .then(res => {
        message.success('操作成功');
        store.rollbackVisible = false;
        store.fetchRecords()
      }, () => setLoading(false))
  }

  const {app_host_ids, deploy_id} = store.record;
  return (
    <Modal
      visible
      width={600}
      maskClosable={false}
      title="新建回滚发布申请"
      onCancel={() => store.rollbackVisible = false}
      confirmLoading={loading}
      onOk={handleSubmit}>
      <Form form={form} initialValues={store.record} labelCol={{span: 5}} wrapperCol={{span: 17}}>
        <Form.Item required name="name" label="申请标题">
          <Input placeholder="请输入申请标题"/>
        </Form.Item>
        <Form.Item required name="request_id" label="选择版本" tooltip="可选择回滚版本与发布配置中的版本数量配置相关。">
          <Select
            showSearch
            placeholder="请选择回滚至哪个版本"
            filterOption={(input, option) => includes(option.props.children, input)}>
            {store.records.filter(x => x.repository_id && x.deploy_id === deploy_id && ['3', '-3'].includes(x.status)).map((item, index) => (
              <Select.Option key={item.id} value={item.id} record={item} disabled={index === 0}>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span>{`${item.name} (${item.version})`}</span>
                  <span style={{color: '#999', fontSize: 12}}>创建于 {moment(item.created_at).fromNow()}</span>
                </div>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item required label="目标主机" tooltip="可以通过创建多个发布申请单，选择主机分批发布。">
          {host_ids.length > 0 && (
            <span style={{marginRight: 16}}>已选择 {host_ids.length} 台（可选{app_host_ids.length}）</span>
          )}
          <Button type="link" style={{padding: 0}} onClick={() => setVisible(true)}>选择主机</Button>
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