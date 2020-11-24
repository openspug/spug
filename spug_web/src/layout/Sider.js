import React from 'react';
import { Layout, Menu } from 'antd';
import { hasPermission, history } from 'libs';
import styles from './layout.module.less';
import menus from '../routes';
import logo from './logo-spug.png';
import logoText from './logo-text.png';

const initPath = window.location.pathname;
let openKeys = [];
loop:
  for (let item of menus.filter(x => x.child)) {
    for (let sub of item.child) {
      if (sub.path === initPath) {
        openKeys = [item.title]
        break loop
      }
    }
  }

export default function Sider(props) {
  function makeMenu(menu) {
    if (menu.auth && !hasPermission(menu.auth)) return null;
    if (!menu.title) return null;
    return menu.child ? _makeSubMenu(menu) : _makeItem(menu)
  }

  function _makeSubMenu(menu) {
    return (
      <Menu.SubMenu key={menu.title} title={<span>{menu.icon}<span>{menu.title}</span></span>}>
        {menu.child.map(menu => makeMenu(menu))}
      </Menu.SubMenu>
    )
  }

  function _makeItem(menu) {
    return (
      <Menu.Item key={menu.path}>
        {menu.icon}
        <span>{menu.title}</span>
      </Menu.Item>
    )
  }

  return (
    <Layout.Sider width={208} collapsed={props.collapsed} className={styles.sider}>
      <div className={styles.logo}>
        <img src={logo} alt="Logo"/>
        <img src={logoText} alt="logo-text" style={{marginLeft: 25, width: 70}}/>
      </div>
      <div className={styles.menus} style={{height: `${document.body.clientHeight - 64}px`}}>
        <Menu
          theme="dark"
          mode="inline"
          className={styles.menus}
          defaultSelectedKeys={[initPath]}
          defaultOpenKeys={openKeys}
          onSelect={menu => history.push(menu.key)}>
          {menus.map(menu => makeMenu(menu))}
        </Menu>
      </div>
    </Layout.Sider>
  )
}