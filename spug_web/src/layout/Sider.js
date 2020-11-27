/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { withRouter } from 'react-router-dom';
import { Layout, Menu, Icon } from 'antd';
import { hasPermission } from "../libs/functools";
import history from '../libs/history';
import styles from './layout.module.css';
import lodash from 'lodash';
import menus from '../menus';
import logo from './logo-spug.png';
import logoText from './logo-text.png';


class Sider extends React.Component {
  constructor(props) {
    super(props);
    this._init(props);
    this.state = {
      selectedKeys: [],
      openKeys: [lodash.get(this.keysMap, props.location.pathname)],
    };
  }

  _init() {
    this.keysMap = {};
    for (let item of menus.filter(x => x.child)) {
      for (let m of item.child) {
        this.keysMap[m.path] = item.title
      }
    }
  }

  UNSAFE_componentWillReceiveProps(nextProps, nextContext) {
    if (nextProps.collapsed && !this.props.collapsed) {
      this.setState({openKeys: []})
    }
  }

  makeMenu = (menu) => {
    if (menu.auth !== undefined && !hasPermission(menu.auth)) return null;
    return (menu.child) ? this.makeSubMenu(menu) : this.makeItem(menu)
  };

  makeItem = (menu) => {
    return (
      <Menu.Item key={menu.path}>
        {menu.icon && <Icon type={menu.icon}/>}
        <span>{menu.title}</span>
      </Menu.Item>
    )
  };

  makeSubMenu = (subMenu) => {
    return (
      <Menu.SubMenu key={subMenu.title} title={<span><Icon type={subMenu.icon}/><span>{subMenu.title}</span></span>}>
        {subMenu.child.map(menu => this.makeMenu(menu))}
      </Menu.SubMenu>
    )
  };

  handleSelect = ({key}) => {
    history.push(key)
  };

  handleClick = ({key}) => {
    if (key === this.state.selectedKeys[0] && key !== this.props.location.pathname) {
      this.props.history.push(key)
    }
  };

  render() {
    return (
      <Layout.Sider collapsed={this.props.collapsed} style={{height: '100vh', overflow: 'auto'}}>
        <div className={styles.logo}>
          <img src={logo} alt="Logo"/>
          <img src={logoText} alt="logo-text" style={{marginLeft: 25, width: 70}} />
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[this.props.location.pathname]}
          openKeys={this.state.openKeys}
          onSelect={this.handleSelect}
          onClick={this.handleClick}
          onOpenChange={openKeys => this.setState({openKeys})}
        >
          {menus.map(menu => this.makeMenu(menu))}
        </Menu>
      </Layout.Sider>
    )
  }
}

export default withRouter(Sider)
