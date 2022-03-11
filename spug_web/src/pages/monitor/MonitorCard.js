/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { Card, Input, Select, Space, Tooltip, Spin, message } from 'antd';
import { FrownOutlined, RedoOutlined, SyncOutlined } from '@ant-design/icons';
import styles from './index.module.less';
import { http, includes } from 'libs';
import moment from 'moment';
import store from './store';

const ColorMap = {
  '0': '#cccccc',
  '1': '#009400',
  '2': '#ffba00',
  '3': '#fa383e',
}

const StatusMap = {
  '1': '正常',
  '2': '警告',
  '3': '紧急',
  '0': '禁用',
}

let AutoReload = null

function CardItem(props) {
  const {status, type, desc, name, target, latest_run_time} = props.data
  const title = (
    <div>
      <div>类型: {type}</div>
      <div>名称: {name}</div>
      <div>描述: {desc}</div>
      <div>目标: {target}</div>
      <div>状态: {StatusMap[status]}</div>
      {latest_run_time ? <div>更新: {latest_run_time}</div> : null}
    </div>
  )
  return (
    <Tooltip title={title}>
      <div className={styles.card} style={{backgroundColor: ColorMap[status]}}>
        {moment(latest_run_time).fromNow()}
      </div>
    </Tooltip>
  )
}

function MonitorCard() {
  const [fetching, setFetching] = useState(true);
  const [autoReload, setAutoReload] = useState(false);
  const [status, setStatus] = useState();
  const [records, setRecords] = useState([]);
  const [dataSource, setDataSource] = useState([]);

  useEffect(() => {
    fetchRecords()

    return () => AutoReload = null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function fetchRecords() {
    if (AutoReload === false) return
    setFetching(true);
    return http.get('/api/monitor/overview/')
      .then(res => setRecords(res))
      .finally(() => {
        setFetching(false)
        if (AutoReload) setTimeout(fetchRecords, 5000)
      })
  }

  useEffect(() => {
    const data = records.filter(x =>
      (!store.f_type || x.type === store.f_type) &&
      (!store.f_group || x.group === store.f_group) &&
      (!store.f_name || includes(x.name, store.f_name))
    )
    setDataSource(data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, store.f_type, store.f_group, store.f_name])

  function handleAutoReload() {
    AutoReload = !autoReload
    message.info(autoReload ? '关闭自动刷新' : '开启自动刷新')
    if (!autoReload) fetchRecords()
    setAutoReload(!autoReload)
  }

  const filteredRecords = dataSource.filter(x => !status || x.status === status)
  return (
    <Card title="总览" style={{marginBottom: 24}} extra={(
      <Space size="middle">
        <Space>
          <div>分组：</div>
          <Select allowClear style={{minWidth: 150}} value={store.f_group} onChange={v => store.f_group = v}
                  placeholder="请选择">
            {store.groups.map(item => (
              <Select.Option value={item} key={item}>{item}</Select.Option>
            ))}
          </Select>
        </Space>
        <Space>
          <div>类型：</div>
          <Select allowClear style={{width: 120}} value={store.f_type} onChange={v => store.f_type = v}
                  placeholder="请选择">
            {store.types.map(item => <Select.Option key={item} value={item}>{item}</Select.Option>)}
          </Select>
        </Space>
        <Space>
          <div>名称：</div>
          <Input allowClear value={store.f_name} onChange={e => store.f_name = e.target.value} placeholder="请输入"/>
        </Space>
      </Space>
    )}>
      <Spin spinning={fetching}>
        <div className={styles.header}>
          {Object.entries(StatusMap).map(([s, desc]) => {
            const count = dataSource.filter(x => x.status === s).length;
            return count ? (
              <div
                key={s}
                className={styles.item}
                style={s === status ? {backgroundColor: ColorMap[s]} : {
                  border: `1.5px solid ${ColorMap[s]}`,
                  color: ColorMap[s]
                }}
                onClick={() => setStatus(s === status ? '' : s)}>
                {dataSource.filter(x => x.status === s).length}
              </div>
            ) : null
          })}
          <div
            className={styles.authLoad}
            style={autoReload ? {backgroundColor: '#1890ff'} : {color: '#1890ff', border: '1.5px solid #1890ff'}}
            onClick={handleAutoReload}>
            {autoReload ? <SyncOutlined/> : <RedoOutlined/>}
          </div>
        </div>
        {filteredRecords.length > 0 ? (
          <Space wrap size={4}>
            {filteredRecords.map(item => (
              <CardItem key={item.id} data={item}/>
            ))}
          </Space>
        ) : (
          <div className={styles.notMatch}><FrownOutlined/></div>
        )}
      </Spin>
    </Card>
  )
}

export default observer(MonitorCard)