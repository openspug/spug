import React from 'react';
import { observer } from 'mobx-react';
import { Modal, Button, Menu, Icon } from 'antd';
import store from './store';
import styles from './index.module.css';
import envStore from 'pages/config/environment/store';
import hostStore from 'pages/host/store';
import appStore from '../app/store';
import lds from 'lodash';

@observer
class SelectApp extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      env_id: 0
    }
  }

  componentDidMount() {
    if (envStore.records.length === 0) {
      envStore.fetchRecords().then(this._initEnv)
    } else {
      this._initEnv()
    }
    if (appStore.records.length === 0) {
      appStore.fetchRecords()
    }
    if (hostStore.records.length === 0) {
      hostStore.fetchRecords()
    }
  }

  _initEnv = () => {
    if (envStore.records.length) {
      this.setState({env_id: envStore.records[0].id})
    }
  };

  handleClick = (app) => {
    store.record = app;
    if (app.extend === '1') {
      store.ext1Visible = true
    } else {
      store.ext2Visible = true
    }
    store.addVisible = false
  };

  render() {
    const {env_id} = this.state;
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
            <Menu
              mode="inline"
              selectedKeys={[String(env_id)]}
              style={{border: 'none'}}
              onSelect={({selectedKeys}) => this.setState({env_id: selectedKeys[0]})}>
              {envStore.records.map(item => <Menu.Item key={item.id}>{item.name}</Menu.Item>)}
            </Menu>
          </div>
          <div className={styles.right}>
            <div className={styles.title}>{lds.get(envStore.idMap, `${env_id}.name`)}</div>
            {appStore.records.map(item => (
              <Button key={item.id} type="primary" className={styles.appBlock} onClick={() => this.handleClick(item)}>
                <div style={{width: 135, overflow: 'hidden', textOverflow: 'ellipsis'}}>
                  <Icon type={item.extend === '1' ? 'ordered-list' : 'build'} style={{marginRight: 10}}/>{item.name}
                </div>
              </Button>
            ))}
          </div>
        </div>
      </Modal>
    )
  }
}

export default SelectApp