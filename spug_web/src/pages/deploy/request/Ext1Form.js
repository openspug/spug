/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, Select, DatePicker, Button, message } from 'antd';
import HostSelector from './HostSelector';
import hostStore from 'pages/host/store';
import { http, history } from 'libs';
import store from './store';
import lds from 'lodash';
import moment from 'moment';

function NoVersions() {
  return (
    <div>
      <span>未找到符合条件的版本，</span>
      <Button
        type="link"
        style={{padding: 0}}
        onClick={() => history.push('/deploy/repository')}>
        去构建新版本？</Button>
    </div>
  )
}

export default observer(function () {
  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState([]);
  const [host_ids, setHostIds] = useState([]);
  const [plan, setPlan] = useState(store.record.plan);

  useEffect(() => {
    const {deploy_id, app_host_ids, host_ids} = store.record;
    setHostIds(lds.clone(host_ids || app_host_ids));
    http.get('/api/repository/', {params: {deploy_id}})
      .then(res => setVersions(res))
    if (!hostStore.records || hostStore.records.length === 0) hostStore.fetchRecords()
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
    if (plan) formData.plan = plan.format('YYYY-MM-DD HH:mm:00');
    http.post('/api/deploy/request/ext1/', formData)
      .then(res => {
        message.success('操作成功');
        store.ext1Visible = false;
        store.fetchRecords()
      }, () => setLoading(false))
  }

  const {app_host_ids, type, rb_id} = store.record;
  return (
    <Modal
      visible
      width={700}
      maskClosable={false}
      title={`${store.record.id ? '编辑' : '新建'}发布申请`}
      onCancel={() => store.ext1Visible = false}
      confirmLoading={loading}
      onOk={handleSubmit}>
      <Form form={form} initialValues={store.record} labelCol={{span: 6}} wrapperCol={{span: 16}}>
        <Form.Item required name="name" label="申请标题">
          <Input placeholder="请输入申请标题"/>
        </Form.Item>
        <Form.Item required name="repository_id" label={type === '2' ? '回滚版本' : '发布版本'}>
          <Select placeholder="请选择" notFoundContent={<NoVersions/>}>
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
        <Form.Item required label="目标主机" tooltip="可以通过创建多个发布申请单，选择主机分批发布。">
          {host_ids.length > 0 && `已选择 ${host_ids.length} 台（可选${app_host_ids.length}）`}
          <Button type="link" onClick={() => setVisible(true)}>选择主机</Button>
        </Form.Item>
        <Form.Item name="desc" label="备注信息">
          <Input placeholder="请输入备注信息"/>
        </Form.Item>
        {type !== '2' && (
          <Form.Item label="定时发布" tooltip="在到达指定时间后自动发布，会有最多1分钟的延迟。">
            <DatePicker
              showTime
              value={plan}
              style={{width: 180}}
              format="YYYY-MM-DD HH:mm"
              placeholder="请设置发布时间"
              onChange={setPlan}/>
            {plan ? <span style={{marginLeft: 24, fontSize: 12, color: '#888'}}>大约 {plan.fromNow()}</span> : null}
          </Form.Item>
        )}
      </Form>
      {visible && <HostSelector
        host_ids={host_ids}
        app_host_ids={app_host_ids}
        onCancel={() => setVisible(false)}
        onOk={ids => setHostIds(ids)}/>}
    </Modal>
  )
})