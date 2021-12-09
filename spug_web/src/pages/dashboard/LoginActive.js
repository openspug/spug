/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { Card, List, Tag } from 'antd';
import { http } from 'libs';
import styles from './index.module.css';

export default function () {
  const [name, setName] = useState(null);
  const [ip, setIp] = useState(null);
  const [rawData, setRawData] = useState([]);
  const [dataSource, setDataSource] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    http.get('/api/account/login/history/')
      .then(res => setRawData(res))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let data = rawData;
    if (name) data = data.filter(x => x.nickname === name);
    if (ip) data = data.filter(x => x.ip === ip);
    setDataSource(data)
  }, [name, ip, rawData])

  return (
    <Card loading={loading} title="最近30天登录" bodyStyle={{paddingTop: 0}} extra={(
      <div>
        {name !== null && <Tag closable color="#1890ff" onClose={() => setName(null)}>{name}</Tag>}
        {ip !== null && <Tag closable color="#1890ff" onClose={() => setIp(null)}>{ip}</Tag>}
      </div>
    )}>
      <List className={styles.loginActive} dataSource={dataSource} renderItem={item => (
        <List.Item>
          <span>{item.created_at}</span>
          <span className={styles.spanText} onClick={() => setName(item.nickname)}>{item.nickname}</span>
          <span>通过</span>
          <span className={styles.spanText} onClick={() => setIp(item.ip)}>{item.ip}</span>
          <span>登录</span>
        </List.Item>
      )}/>
    </Card>
  )
}
