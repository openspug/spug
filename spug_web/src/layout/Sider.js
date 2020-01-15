/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { withRouter } from 'react-router-dom';
import { Layout, Menu, Icon } from 'antd';
import { hasPermission } from "../libs/functools";
import history from '../libs/history';
import styles from './layout.module.css';
import lodash from 'lodash';
import menus from '../menus';
import logo from './logo.svg';


class Sider extends React.Component {
  constructor(props) {
    super(props);
    this.keysMap = {};
    this.state = {
      selectedKeys: [props.location.pathname],
      openKeys: [],
    };
  }

  componentDidMount() {
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
    this.setState({selectedKeys: [key]});
    history.push(key)
  };

  handleClick = ({key}) => {
    if (key === this.state.selectedKeys[0] && key !== this.props.location.pathname) {
      this.props.history.push(key)
    }
  };

  render() {
    const subKey = lodash.get(this.keysMap, this.props.location.pathname);
    let {openKeys} = this.state;
    if (subKey && !openKeys.includes(subKey) && !this.props.collapsed) openKeys.push(subKey);
    return (
      <Layout.Sider
        collapsed={this.props.collapsed}
      >
        <div className={styles.logo}>
          <img src={logo} alt="Logo"/>
          <h1>Spug</h1>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={this.state.selectedKeys}
          openKeys={openKeys}
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
