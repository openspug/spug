/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, Select, Button, Steps, Cascader, Radio, message } from 'antd';
import http from 'libs/http';
import { t } from 'libs';
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
  const [username, setUsername] = useState('root');
  const [port, setPort] = useState('22');
  const [host_type, setHostType] = useState('private');

  function handleSubmit() {
    setLoading(true);
    const formData = {
      ak,
      ac,
      type: store.cloudImport,
      region_id: regionId,
      group_id: groupId[groupId.length - 1],
      username,
      port,
      host_type
    };
    http.post('/api/host/import/cloud/', formData, {timeout: 120000})
      .then(res => {
        message.success(t('已同步/导入 {} 台主机', res));
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

  const helpUrl = store.cloudImport === 'ali' ? 'https://help.aliyun.com/document_detail/175967.html' : 'https://console.cloud.tencent.com/capi';
  return (
    <Modal
      open
      maskClosable={false}
      title={t('批量导入')}
      footer={null}
      onCancel={() => store.cloudImport = null}>
      <Steps
        current={step}
        className={styles.steps}
        items={[
          {title: t('访问凭据')},
          {title: t('导入确认')}
        ]}/>
      <Form labelCol={{span: 8}} wrapperCol={{span: 14}}>
        <Form.Item hidden={step === 1} required label="AccessKey ID">
          <Input value={ak} onChange={e => setAK(e.target.value)} placeholder={t('请输入')}/>
        </Form.Item>
        <Form.Item hidden={step === 1} required label="AccessKey Secret" extra={(
          <a href={helpUrl} target="_blank" rel="noopener noreferrer">{t('如何获取AccessKey ？')}</a>
        )}>
          <Input value={ac} onChange={e => setAC(e.target.value)} placeholder={t('请输入')}/>
        </Form.Item>
        <Form.Item hidden={step === 0} required label={t('选择区域')} tooltip={t('选择导入指定区域的主机。')}>
          <Select placeholder={t('请选择')} value={regionId} onChange={setRegionId}>
            {regions.map(item => (
              <Select.Option key={item.id} value={item.id}>{item.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item hidden={step === 0} required label={t('选择分组')} tooltip={t('将主机导入指定分组。')}>
          <Cascader
            value={groupId}
            onChange={setGroupId}
            options={store.treeData}
            fieldNames={{label: 'title'}}
            placeholder={t('请选择')}/>
        </Form.Item>
        <Form.Item hidden={step === 0} label={t('基础信息')} tooltip={t('以下信息用于进行SSH验证，导入完成后通过点击批量验证按钮进行批量验证并同步主机扩展信息。')}/>
        <Form.Item hidden={step === 0} labelCol={{span: 10}} wrapperCol={{span: 12}} label={t('用户名')}>
          <Input value={username} onChange={e => setUsername(e.target.value)} placeholder={t('默认SSH登录的账户名')}/>
        </Form.Item>
        <Form.Item hidden={step === 0} labelCol={{span: 10}} wrapperCol={{span: 12}} label={t('端口号')}>
          <Input value={port} onChange={e => setPort(e.target.value)} placeholder={t('默认SSH端口号')}/>
        </Form.Item>
        <Form.Item hidden={step === 0} labelCol={{span: 10}} wrapperCol={{span: 12}} label={t('连接地址')}
                   extra={t('将根据选择进行自动匹配获取。')}>
          <Radio.Group value={host_type} onChange={e => setHostType(e.target.value)}>
            <Radio value="public">{t('公网地址')}</Radio>
            <Radio value="private">{t('私网地址')}</Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item wrapperCol={{span: 14, offset: 8}}>
          {step === 0 ? (
            <Button type="primary" loading={loading} disabled={!ak || !ac} onClick={fetchRegions}>{t('下一步')}</Button>
          ) : ([
            <Button
              key="1"
              type="primary"
              loading={loading}
              disabled={!regionId || !groupId}
              onClick={handleSubmit}>{t('同步导入')}</Button>,
            <Button key="2" style={{marginLeft: 24}} onClick={() => setStep(0)}>{t('上一步')}</Button>
          ])}
        </Form.Item>
      </Form>
    </Modal>
  );
})
