/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, Button, Radio } from 'antd';
import Sync from './Sync';
import { http, t } from 'libs';
import store from './store';

export default observer(function () {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState();
  const [range, setRange] = useState('2');
  const [hosts, setHosts] = useState();
  const [token, setToken] = useState();

  function handleSubmit() {
    setLoading(true);
    http.post('/api/host/valid/', {password, range})
      .then(res => {
        setHosts(res.hosts);
        setToken(res.token);
      })
      .finally(() => setLoading(false))
  }

  function handleClose() {
    store.showSync();
    store.fetchRecords()
  }

  const unVerifiedLength = store.records.filter(x => !x.is_verified).length;
  return (
    <Modal
      visible
      maskClosable={false}
      title={t('批量验证（同步）')}
      okText={t('导入')}
      onCancel={handleClose}
      footer={null}>
      <Form hidden={token} labelCol={{span: 6}} wrapperCol={{span: 14}}>
        <Form.Item name="password" label={t('默认密码')} tooltip={t('会被用于未验证主机的验证。')}>
          <Input.Password value={password} onChange={e => setPassword(e.target.value)}/>
        </Form.Item>
        <Form.Item label={t('选择主机')} tooltip={t('要批量验证/同步哪些主机，全部主机或仅未验证主机。')} extra={t('将会覆盖已有的扩展信息（CPU、内存、磁盘等）。')}>
          <Radio.Group
            value={range}
            onChange={e => setRange(e.target.value)}
            options={[
              {label: t('全部（{}）', store.records.length), value: '1'},
              {label: t('未验证（{}）', unVerifiedLength), value: '2'}
            ]}
            optionType="button"/>
        </Form.Item>
        <Form.Item wrapperCol={{span: 14, offset: 6}}>
          <Button loading={loading} type="primary" onClick={handleSubmit}>{t('提交验证')}</Button>
        </Form.Item>
      </Form>

      {token && hosts ? (
        <Sync token={token} hosts={hosts}/>
      ) : null}
    </Modal>
  );
})
