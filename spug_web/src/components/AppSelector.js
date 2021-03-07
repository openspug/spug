/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { observer } from 'mobx-react';
import { Modal, Button, Menu, Spin, Input, Tooltip } from 'antd';
import { OrderedListOutlined, BuildOutlined } from '@ant-design/icons';
import { includes, http } from 'libs';
import styles from './index.module.less';
import envStore from 'pages/config/environment/store';
import lds from 'lodash';

export default observer(function AppSelector(props) {
  const [fetching, setFetching] = useState(false);
  const [refs, setRefs] = useState({});
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

  function handleRef(el, id) {
    if (el && !refs.hasOwnProperty(id)) {
      setTimeout(() => {
        refs[id] = el.scrollWidth > el.clientWidth;
        setRefs({...refs})
      }, 200)
    }
  }

  let records = deploys.filter(x => x.env_id === Number(env_id));
  if (search) records = records.filter(x => includes(x['app_name'], search));
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
              onSelect={({selectedKeys}) => setEnvId(selectedKeys[0])}>
              {envStore.records.map(item => <Menu.Item key={item.id}>{item.name}</Menu.Item>)}
            </Menu>
          </Spin>
        </div>

        <div className={styles.right}>
          <Spin spinning={fetching}>
            <div className={styles.title}>
              <div>{lds.get(envStore.idMap, `${env_id}.name`)}</div>
              <Input.Search
                allowClear
                style={{width: 200}}
                placeholder="请输入快速搜应用"
                onChange={e => setSearch(e.target.value)}/>
            </div>
            {records.map(item => (
              <Tooltip key={item.id} title={refs[item.id] ? item['app_name'] : null}>
                <Button type="primary" className={styles.appBlock} onClick={() => props.onSelect(item)}>
                  <div ref={el => handleRef(el, item.id)}
                       style={{width: 135, overflow: 'hidden', textOverflow: 'ellipsis'}}>
                    {item.extend === '1' ? <OrderedListOutlined/> : <BuildOutlined/>}
                    <span style={{marginLeft: 8}}>{item.app_name}</span>
                  </div>
                </Button>
              </Tooltip>
            ))}
            {records.length === 0 &&
            <div className={styles.tips}>该环境下还没有可发布或构建的应用哦，快去<Link to="/deploy/app">应用管理</Link>创建应用发布配置吧。</div>}
          </Spin>
        </div>
      </div>
    </Modal>
  )
})
