/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Layout, Dropdown, Menu, List, Icon, Badge, Avatar } from 'antd';
import styles from './layout.module.css';
import http from '../libs/http';
import history from '../libs/history';
import avatar from './avatar.png';
import moment from 'moment';

export default class extends React.Component {
  constructor(props) {
    super(props);
    this.inerval = null;
    this.state = {
      loading: true,
      notifies: [],
      read: []
    }
  }

  componentDidMount() {
    this.fetch();
    this.interval = setInterval(this.fetch, 30000)
  }

  componentWillUnmount() {
    this.interval && clearInterval(this.interval)
  }

  fetch = () => {
    this.setState({loading: true});
    http.get('/api/notify/')
      .then(res => this.setState({notifies: res, read: []}))
      .finally(() => this.setState({loading: false}))
  };

  handleLogout = () => {
    history.push('/');
    http.get('/api/account/logout/')
  };

  handleRead = (e, item) => {
    e.stopPropagation();
    this.state.read.push(item.id);
    this.setState({read: this.state.read});
    http.patch('/api/notify/', {ids: [item.id]})
  };

  handleReadAll = () => {
    const ids = this.state.notifies.map(x => x.id);
    this.setState({read: ids});
    http.patch('/api/notify/', {ids})
  };
  menu = (
    <Menu>
      <Menu.Item>
        <Link to="/welcome/info">
          <Icon type="user" style={{marginRight: 10}}/>个人中心
        </Link>
      </Menu.Item>
      <Menu.Divider/>
      <Menu.Item onClick={this.handleLogout}>
        <Icon type="logout" style={{marginRight: 10}}/>退出登录
      </Menu.Item>
    </Menu>
  );

  notify = () => (
    <Menu className={styles.notify}>
      <Menu.Item style={{padding: 0, whiteSpace: 'unset'}}>
        <List
          loading={this.state.loading}
          style={{maxHeight: 500, overflow: 'scroll'}}
          itemLayout="horizontal"
          dataSource={this.state.notifies}
          renderItem={item => (
            <List.Item className={styles.notifyItem} onClick={e => this.handleRead(e, item)}>
              <List.Item.Meta
                style={{opacity: this.state.read.includes(item.id) ? 0.4 : 1}}
                avatar={<Icon type={item.source} style={{fontSize: 24, color: '#1890ff'}}/>}
                title={<span style={{fontWeight: 400, color: '#404040'}}>{item.title}</span>}
                description={[
                  <div key="1" style={{fontSize: 12}}>{item.content}</div>,
                  <div key="2" style={{fontSize: 12}}>{moment(item['created_at']).fromNow()}</div>
                ]}/>
            </List.Item>
          )}/>
        {this.state.notifies.length !== 0 && (
          <div className={styles.notifyFooter} onClick={() => this.handleReadAll()}>全部 已读</div>
        )}
      </Menu.Item>
    </Menu>
  );

  render() {
    const {notifies, read} = this.state;
    return (
      <Layout.Header style={{padding: 0}}>
        <div className={styles.header}>
          <div className={styles.trigger} onClick={this.props.toggle}>
            <Icon type={this.props.collapsed ? 'menu-unfold' : 'menu-fold'}/>
          </div>
          <div className={styles.right}>
            <Dropdown overlay={this.menu}>
              <span className={styles.action}>
                <Avatar size="small" src={avatar} style={{marginRight: 8}}/>
                {localStorage.getItem('nickname')}
              </span>
            </Dropdown>
          </div>
          <div className={styles.right}>
            <Dropdown overlay={this.notify} trigger={['click']}>
              <span className={styles.trigger}>
                <Badge count={notifies.length - read.length}>
                  <Icon type="notification" style={{fontSize: 16}}/>
                </Badge>
              </span>
            </Dropdown>
          </div>
        </div>
      </Layout.Header>
    )
  }
}