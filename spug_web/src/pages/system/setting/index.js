/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { Menu } from 'antd';
import {AuthDiv} from 'components';
import BasicSetting from './BasicSetting';
import AlarmSetting from './AlarmSetting';
import OpenService from './OpenService';
import styles from './index.module.css';
import store from './store';


class Index extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedKeys: ['basic']
    }
  }

  componentDidMount() {
    store.fetchSettings()
  }

  render() {
    const {selectedKeys} = this.state;
    return (
      <AuthDiv auth="system.setting.view" className={styles.container}>
        <div className={styles.left}>
          <Menu
            mode="inline"
            selectedKeys={selectedKeys}
            style={{border: 'none'}}
            onSelect={({selectedKeys}) => this.setState({selectedKeys})}>
            <Menu.Item key="basic">基本设置</Menu.Item>
            <Menu.Item key="alarm">报警服务设置</Menu.Item>
            <Menu.Item key="service">开放服务设置</Menu.Item>
          </Menu>
        </div>
        <div className={styles.right}>
          {selectedKeys[0] === 'basic' && <BasicSetting />}
          {selectedKeys[0] === 'alarm' && <AlarmSetting />}
          {selectedKeys[0] === 'service' && <OpenService />}
        </div>
      </AuthDiv>
    )
  }
}

export default Index
