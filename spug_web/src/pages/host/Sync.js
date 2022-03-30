/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { Form } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { X_TOKEN } from 'libs';
import styles from './index.module.less';

export default function (props) {
  const [hosts, setHosts] = useState(props.hosts);

  useEffect(() => {
    let index = 0;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/api/ws/host/${props.token}/?x-token=${X_TOKEN}`);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Form labelCol={{span: 8}} wrapperCol={{span: 14}} className={styles.batchSync} style={props.style}>
      {Object.entries(hosts).map(([key, item]) => (
        <Form.Item key={key} label={item.name} extra={item.message}>
          {item.status === 'ok' && <span style={{color: "#52c41a"}}>成功</span>}
          {item.status === 'fail' && <span style={{color: "red"}}>失败</span>}
          {item.status === undefined && <LoadingOutlined/>}
        </Form.Item>
      ))}
    </Form>
  )
}
