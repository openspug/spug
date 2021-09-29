/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { observer } from 'mobx-react';
import { Modal, Menu, Spin, Icon, Input } from 'antd';
import { includes } from 'libs';
import store from './store';
import styles from './index.module.css';
import envStore from 'pages/config/environment/store';
import lds from 'lodash';

@observer
class SelectApp extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      env_id: 0,
      search: ''
    }
  }

  componentDidMount() {
    store.loadDeploys();
    if (envStore.records.length === 0) {
      envStore.fetchRecords().then(this._initEnv)
    } else {
      this._initEnv()
    }
  }

  componentWillUnmount() {
    store.refs = {}
  }

  _initEnv = () => {
    if (envStore.records.length) {
      this.setState({env_id: envStore.records[0].id})
    }
  };

  handleClick = (deploy) => {
    store.record = {deploy_id: deploy.id, app_host_ids: deploy.host_ids};
    if (deploy.extend === '1') {
      store.ext1Visible = true
    } else {
      store.ext2Visible = true
    }
    store.addVisible = false
  };

  render() {
    const {env_id} = this.state;
    let records = store.deploys.filter(x => x.env_id === Number(env_id));
    if (this.state.search) {
      records = records.filter(x => includes(x['app_name'], this.state.search) || includes(x['app_key'], this.state.search))
    }
    return (
      <Modal
        visible
        width={800}
        maskClosable={false}
        title="选择应用"
        bodyStyle={{padding: 0}}
        onCancel={() => store.addVisible = false}
        footer={null}>
        <div className={styles.container}>
          <div className={styles.left}>
            <Spin spinning={envStore.isFetching}>
              <Menu
                mode="inline"
                selectedKeys={[String(env_id)]}
                style={{border: 'none'}}
                onSelect={({selectedKeys}) => this.setState({env_id: selectedKeys[0]})}>
                {envStore.records.map(item => <Menu.Item key={item.id}>{item.name}</Menu.Item>)}
              </Menu>
            </Spin>
          </div>

          <div className={styles.right}>
            <Spin spinning={store.isLoading}>
              <div className={styles.title}>
                <div>{lds.get(envStore.idMap, `${env_id}.name`)}</div>
                <Input
                  allowClear
                  style={{width: 200}}
                  placeholder="请输入快速检索应用"
                  prefix={<Icon type="search" style={{color: 'rgba(0, 0, 0, 0.25)'}}/>}
                  onChange={e => this.setState({search: e.target.value})}/>
              </div>
              <div style={{height: 540, overflow: 'auto'}}>
                {records.map(item => (
                  <div key={item.id} className={styles.appItem} onClick={() => this.handleClick(item)}>
                    {item.extend === '1' ? <Icon type="ordered-list"/> : <Icon type="build"/>}
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
  }
}

export default SelectApp
