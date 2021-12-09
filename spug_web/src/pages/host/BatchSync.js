/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, Button, Radio } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { http, X_TOKEN } from 'libs';
import store from './store';

export default observer(function () {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState();
  const [range, setRange] = useState('2');
  const [hosts, setHosts] = useState({});
  const [token, setToken] = useState();

  useEffect(() => {
    if (token) {
      let index = 0;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${protocol}//${window.location.host}/api/ws/host/${token}/?x-token=${X_TOKEN}`);
      socket.onopen = () => socket.send(String(index));
      socket.onmessage = e => {
        if (e.data === 'pong') {
          socket.send(String(index))
        } else {
          index += 1;
          const {key, status, message} = JSON.parse(e.data);
          hosts[key]['status'] = status;
          hosts[key]['message'] = message;
          setHosts({...hosts})
        }
      }
      return () => socket && socket.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

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
      title="批量验证（同步）"
      okText="导入"
      onCancel={handleClose}
      footer={null}>
      <Form hidden={token} labelCol={{span: 6}} wrapperCol={{span: 14}}>
        <Form.Item name="password" label="默认密码" tooltip="会被用于未验证主机的验证。">
          <Input.Password value={password} onChange={e => setPassword(e.target.value)}/>
        </Form.Item>
        <Form.Item label="选择主机" tooltip="要批量验证/同步哪些主机，全部主机或仅未验证主机。" extra="将会覆盖已有的扩展信息（CPU、内存、磁盘等）。">
          <Radio.Group
            value={range}
            onChange={e => setRange(e.target.value)}
            options={[
              {label: `全部（${store.records.length}）`, value: '1'},
              {label: `未验证（${unVerifiedLength}）`, value: '2'}
            ]}
            optionType="button"/>
        </Form.Item>
        <Form.Item wrapperCol={{span: 14, offset: 6}}>
          <Button loading={loading} type="primary" onClick={handleSubmit}>提交验证</Button>
        </Form.Item>
      </Form>

      <Form hidden={!token} labelCol={{span: 8}} wrapperCol={{span: 14}}>
        {Object.entries(hosts).map(([key, item]) => (
          <Form.Item key={key} label={item.name} extra={item.message}>
            {item.status === 'ok' && <span style={{color: "#52c41a"}}>成功</span>}
            {item.status === 'fail' && <span style={{color: "red"}}>失败</span>}
            {item.status === undefined && <LoadingOutlined style={{fontSize: 20}}/>}
          </Form.Item>
        ))}
      </Form>
    </Modal>
  );
})
