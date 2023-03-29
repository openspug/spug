/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { observer } from 'mobx-react';
import { Modal, Menu, Spin, Input } from 'antd';
import { OrderedListOutlined, BuildOutlined, SearchOutlined } from '@ant-design/icons';
import { includes, http } from 'libs';
import styles from './index.module.less';
import envStore from 'pages/config/environment/store';
import lds from 'lodash';

export default observer(function AppSelector(props) {
  const [fetching, setFetching] = useState(false);
  const [env_id, setEnvId] = useState();
  const [search, setSearch] = useState();
  const [deploys, setDeploys] = useState([]);

  useEffect(() => {
    setFetching(true);
    http.get('/api/app/deploy/')
      .then(res => setDeploys(res))
      .finally(() => setFetching(false))
    if (!envStore.records.length) {
      envStore.fetchRecords().then(_initEnv)
    } else {
      _initEnv()
    }
  }, [])

  function _initEnv() {
    if (envStore.records.length) {
      setEnvId(envStore.records[0].id)
    }
  }

  let records = deploys.filter(x => x.env_id === Number(env_id));
  if (search) records = records.filter(x => includes(x['app_name'], search) || includes(x['app_key'], search));
  if (props.filter) records = records.filter(x => props.filter(x));
  return (
    <Modal
      visible={props.visible}
      width={800}
      maskClosable={false}
      title="选择应用"
      bodyStyle={{padding: 0}}
      onCancel={props.onCancel}
      footer={null}>
      <div className={styles.appSelector}>
        <div className={styles.left}>
          <Spin spinning={envStore.isFetching}>
            <Menu
              mode="inline"
              selectedKeys={[String(env_id)]}
              style={{border: 'none'}}
              items={envStore.records.map(x => ({key: x.id, label: x.name, title: x.name}))}
              onSelect={({selectedKeys}) => setEnvId(selectedKeys[0])}/>
          </Spin>
        </div>

        <div className={styles.right}>
          <Spin spinning={fetching}>
            <div className={styles.title}>
              <div className={styles.text}>{lds.get(envStore.idMap, `${env_id}.name`)}</div>
              <Input
                allowClear
                style={{width: 200}}
                placeholder="请输入快速检索应用"
                prefix={<SearchOutlined style={{color: 'rgba(0, 0, 0, 0.25)'}}/>}
                onChange={e => setSearch(e.target.value)}/>
            </div>
            <div style={{height: 540, overflow: 'auto'}}>
              {records.map(item => (
                <div key={item.id} className={styles.appItem} onClick={() => props.onSelect(item)}>
                  {item.extend === '1' ? <OrderedListOutlined/> : <BuildOutlined/>}
                  <div className={styles.body}>{item.app_name}</div>
                  <div style={{color: '#999'}}>{item.app_key}</div>
                </div>
              ))}
              {records.length === 0 &&
              <div className={styles.tips}>该环境下还没有可发布或构建的应用哦，快去<Link to="/deploy/app">应用管理</Link>创建应用发布配置吧。</div>}
            </div>
          </Spin>
        </div>
      </div>
    </Modal>
  )
})
