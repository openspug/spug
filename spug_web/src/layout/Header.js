import React from 'react';
import { Layout, Dropdown, Menu, Icon, Avatar } from 'antd';
import styles from './layout.module.css';
import http from '../libs/http';
import history from '../libs/history';
import avatar from './avatar.png';


export default class extends React.Component {
  handleLogout = () => {
    history.push('/');
    http.get('/api/account/logout/')
  };

  render() {
    const menu = (
      <Menu>
        <Menu.Item disabled>
          <Icon type="user" style={{marginRight: 10}}/>个人中心
        </Menu.Item>
        <Menu.Divider/>
        <Menu.Item onClick={this.handleLogout}>
          <Icon type="logout" style={{marginRight: 10}}/>退出登录
        </Menu.Item>
      </Menu>
    );
    return (
      <Layout.Header style={{padding: 0}}>
        <div className={styles.header}>
          <div className={styles.trigger} onClick={this.props.toggle}>
            <Icon type={this.props.collapsed ? 'menu-unfold' : 'menu-fold'}/>
          </div>
          <div className={styles.right}>
            <Dropdown overlay={menu}>
              <span className={styles.action}>
                <Avatar size="small" src={avatar} style={{marginRight: 8}}/>
                {localStorage.getItem('nickname')}
              </span>
            </Dropdown>
          </div>
        </div>
      </Layout.Header>
    )
  }
}