/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { Card, Input, Select, Space, Tooltip, Spin, message } from 'antd';
import { FrownOutlined, ReloadOutlined, SyncOutlined } from '@ant-design/icons';
import styles from './index.module.less';
import store from './store';

const StyleMap = {
  '0': {background: '#99999933', border: '1px solid #999', color: '#999999'},
  '1': {background: '#16a98733', border: '1px solid #16a987', color: '#16a987'},
  '2': {background: '#ffba0033', border: '1px solid #ffba00', color: '#ffba00'},
  '3': {background: '#f2655d33', border: '1px solid #f2655d', color: '#f2655d'},
  '10': {background: '#99999919', border: '1px dashed #999999', color: '#999999'}
}

const StatusMap = {
  '1': '正常',
  '2': '警告',
  '3': '紧急',
  '0': '未激活',
  '10': '待调度'
}

function CardItem(props) {
  const {status, type, group, desc, name, target, latest_run_time} = props.data
  const title = (
    <div>
      <div>分组: {group}</div>
      <div>类型: {type}</div>
      <div>名称: {name}</div>
      <div>目标: {target}</div>
      <div>状态: {StatusMap[status]}</div>
      <div>更新: {latest_run_time || '---'}</div>
      <div>描述: {desc}</div>
    </div>
  )
  return (
    <Tooltip title={title}>
      <div className={styles.card} style={StyleMap[status]}/>
    </Tooltip>
  )
}

function MonitorCard() {
  const [autoReload, setAutoReload] = useState(false);
  const [status, setStatus] = useState();

  useEffect(() => {
    store.fetchOverviews()

    return () => store.autoReload = null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleAutoReload() {
    store.autoReload = !autoReload
    message.info(autoReload ? '关闭自动刷新' : '开启自动刷新')
    if (!autoReload) store.fetchOverviews()
    setAutoReload(!autoReload)
  }

  const filteredRecords = store.ovDataSource.filter(x => !status || x.status === status)
  return (
    <Card title="总览" style={{marginBottom: 24}} bodyStyle={{padding: '12px 24px'}} extra={(
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
      <Spin spinning={store.ovFetching}>
        <div className={styles.header}>
          {Object.entries(StyleMap).map(([s, style]) => {
            const count = store.ovDataSource.filter(x => x.status === s).length;
            return count ? (
              <Tooltip key={s} title={StatusMap[s]}>
                <div
                  className={styles.item}
                  style={s === status ? style : {...style, background: '#fff'}}
                  onClick={() => setStatus(s === status ? '' : s)}>
                  {store.ovDataSource.filter(x => x.status === s).length}
                </div>
              </Tooltip>
            ) : null
          })}
          <Tooltip title="自动刷新">
            <div className={styles.autoLoad} onClick={handleAutoReload}>
              {autoReload ? <SyncOutlined spin style={{color: '#2563fc'}}/> : <ReloadOutlined/>}
            </div>
          </Tooltip>
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