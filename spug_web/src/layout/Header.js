/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Layout, Dropdown, Avatar } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  CodeOutlined,
  GlobalOutlined,
  CheckOutlined
} from '@ant-design/icons';
import { AuthDiv } from 'components';
import Notification from './Notification';
import styles from './layout.module.less';
import http from '../libs/http';
import history from '../libs/history';
import { t, langMode, setLanguage } from '../libs/i18n';
import avatar from './avatar.png';

export default function (props) {

  function handleLogout() {
    history.push('/');
    http.get('/api/account/logout/')
  }

  function openTerminal() {
    window.open('/ssh')
  }

  const userMenu = {
    items: [
      {
        key: 'profile',
        label: (
          <Link to="/welcome/info">
            <UserOutlined style={{marginRight: 10}}/>{t('个人中心')}
          </Link>
        )
      },
      {type: 'divider'},
      {
        key: 'logout',
        onClick: handleLogout,
        label: <span><LogoutOutlined style={{marginRight: 10}}/>{t('退出登录')}</span>
      }
    ]
  };

  const languageMenu = {
    selectedKeys: [langMode],
    items: [
      {
        key: 'zh',
        onClick: () => setLanguage('zh'),
        label: <span>
          {langMode === 'zh' ? <CheckOutlined style={{marginRight: 8}}/> : <span style={{marginRight: 22}}/>}简体中文
        </span>
      },
      {
        key: 'en',
        onClick: () => setLanguage('en'),
        label: <span>
          {langMode === 'en' ? <CheckOutlined style={{marginRight: 8}}/> : <span style={{marginRight: 22}}/>}English
        </span>
      }
    ]
  };

  return (
    <Layout.Header className={styles.header}>
      <div className={styles.left}>
        <div className={styles.trigger} onClick={props.toggle}>
          {props.collapsed ? <MenuUnfoldOutlined/> : <MenuFoldOutlined/>}
        </div>
      </div>
      <Notification/>
      <AuthDiv className={styles.terminal} auth="host.console.view|host.console.list" onClick={openTerminal}>
        <CodeOutlined style={{fontSize: 16}}/>
      </AuthDiv>
      <div className={styles.terminal}>
        <Dropdown menu={languageMenu} placement="bottomRight">
          <GlobalOutlined style={{fontSize: 16}}/>
        </Dropdown>
      </div>
      <div className={styles.user}>
        <Dropdown menu={userMenu} style={{background: '#000'}}>
          <span className={styles.action}>
            <Avatar size="small" src={avatar} style={{marginRight: 8}}/>
            {localStorage.getItem('nickname')}
          </span>
        </Dropdown>
      </div>
    </Layout.Header>
  )
}
