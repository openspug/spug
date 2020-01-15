/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { Layout } from 'antd';
import Sider from './Sider';
import Header from './Header';
import Footer from './Footer'
import { Router } from '../libs/router';
import { updatePermissions} from '../libs';
import styles from './layout.module.css';


export default class extends React.Component {
  constructor(props) {
    super(props);
    this.initPermissions();
    this.state = {
      collapsed: false
    }
  }

  initPermissions() {
    const data = localStorage.getItem('permissions');
    const isSuper = localStorage.getItem('is_supper') === 'true';
    data && updatePermissions(isSuper, JSON.parse(data))
  }

  render() {
    return (
      <Layout style={{minHeight: '100vh'}}>
        <Sider collapsed={this.state.collapsed}/>
        <Layout>
          <Header
            collapsed={this.state.collapsed}
            toggle={() => this.setState({collapsed: !this.state.collapsed})}
          />
          <Layout.Content className={styles.content} style={{height: `${document.body.clientHeight - 64}px`}}>
            <Router/>
            <Footer/>
          </Layout.Content>
        </Layout>
      </Layout>
    )
  }
}
