/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, Select, Button, Steps, Cascader, message } from 'antd';
import http from 'libs/http';
import store from './store';
import styles from './index.module.less';

export default observer(function () {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [ak, setAK] = useState();
  const [ac, setAC] = useState();
  const [regionId, setRegionId] = useState();
  const [groupId, setGroupId] = useState([]);
  const [regions, setRegions] = useState([]);

  function handleSubmit() {
    setLoading(true);
    const formData = {ak, ac, type: store.cloudImport, region_id: regionId, group_id: groupId[groupId.length - 1]};
    http.post('/api/host/import/cloud/', formData, {timeout: 120000})
      .then(res => {
        message.success(`已同步/导入 ${res} 台主机`);
        store.cloudImport = null;
        store.fetchRecords()
      }, () => setLoading(false))
  }

  function fetchRegions() {
    setLoading(true);
    http.get('/api/host/import/region/', {params: {ak, ac, type: store.cloudImport}})
      .then(res => {
        setRegions(res)
        setStep(1)
      })
      .finally(() => setLoading(false))
  }

  return (
    <Modal
      visible
      maskClosable={false}
      title="批量导入"
      footer={null}
      onCancel={() => store.cloudImport = null}>
      <Steps current={step} className={styles.steps}>
        <Steps.Step key={0} title="访问凭据"/>
        <Steps.Step key={1} title="导入确认"/>
      </Steps>
      <Form labelCol={{span: 8}} wrapperCol={{span: 14}}>
        <Form.Item hidden={step === 1} required label="AccessKey ID">
          <Input value={ak} onChange={e => setAK(e.target.value)} placeholder="请输入"/>
        </Form.Item>
        <Form.Item hidden={step === 1} required label="AccessKey Secret">
          <Input value={ac} onChange={e => setAC(e.target.value)} placeholder="请输入"/>
        </Form.Item>
        <Form.Item hidden={step === 0} required label="选择区域">
          <Select placeholder="请选择" value={regionId} onChange={setRegionId}>
            {regions.map(item => (
              <Select.Option key={item.id} value={item.id}>{item.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item hidden={step === 0} required label="选择分组">
          <Cascader
            value={groupId}
            onChange={setGroupId}
            options={store.treeData}
            fieldNames={{label: 'title'}}
            placeholder="请选择"/>
        </Form.Item>
        <Form.Item wrapperCol={{span: 14, offset: 8}}>
          {step === 0 ? (
            <Button type="primary" loading={loading} disabled={!ak || !ac} onClick={fetchRegions}>下一步</Button>
          ) : ([
            <Button
              key="1"
              type="primary"
              loading={loading}
              disabled={!regionId || !groupId}
              onClick={handleSubmit}>同步导入</Button>,
            <Button key="2" style={{marginLeft: 24}} onClick={() => setStep(0)}>上一步</Button>
          ])}
        </Form.Item>
      </Form>
    </Modal>
  );
})
