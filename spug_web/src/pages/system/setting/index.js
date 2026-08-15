/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { Menu } from 'antd';
import { AuthDiv, Breadcrumb } from 'components';
import { t } from 'libs';
import BasicSetting from './BasicSetting';
import AlarmSetting from './AlarmSetting';
import LDAPSetting from './LDAPSetting';
import OpenService from './OpenService';
import KeySetting from './KeySetting';
import PushSetting from './PushSetting';
import SecuritySetting from './SecuritySetting';
import About from './About';
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
      <AuthDiv auth="system.setting.view">
        <Breadcrumb>
          <Breadcrumb.Item>{t('首页')}</Breadcrumb.Item>
          <Breadcrumb.Item>{t('系统管理')}</Breadcrumb.Item>
          <Breadcrumb.Item>{t('系统设置')}</Breadcrumb.Item>
        </Breadcrumb>
        <div className={styles.container}>
          <div className={styles.left}>
            <Menu
              mode="inline"
              selectedKeys={selectedKeys}
              style={{border: 'none'}}
              onSelect={({selectedKeys}) => this.setState({selectedKeys})}
              items={[
                {key: 'basic', label: t('基本设置')},
                {key: 'security', label: t('安全设置')},
                {key: 'ldap', label: t('LDAP设置')},
                {key: 'key', label: t('密钥设置')},
                {key: 'alarm', label: t('报警服务设置')},
                {key: 'push', label: t('推送服务设置')},
                {key: 'service', label: t('开放服务设置')},
                {key: 'about', label: t('关于')}
              ]}/>
          </div>
          <div className={styles.right}>
            {selectedKeys[0] === 'basic' && <BasicSetting/>}
            {selectedKeys[0] === 'security' && <SecuritySetting/>}
            {selectedKeys[0] === 'ldap' && <LDAPSetting/>}
            {selectedKeys[0] === 'alarm' && <AlarmSetting/>}
            {selectedKeys[0] === 'push' && <PushSetting/>}
            {selectedKeys[0] === 'service' && <OpenService/>}
            {selectedKeys[0] === 'key' && <KeySetting/>}
            {selectedKeys[0] === 'about' && <About/>}
          </div>
        </div>
      </AuthDiv>
    )
  }
}

export default Index
