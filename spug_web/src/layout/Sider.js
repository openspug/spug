import React, { useState } from 'react';
import { Layout, Menu } from 'antd';
import { hasPermission, history } from 'libs';
import styles from './layout.module.less';
import menus from '../routes';
import logo from './logo-spug-white.png';

let selectedKey = window.location.pathname;
const OpenKeysMap = {};
for (let item of menus) {
  if (item.child) {
    for (let sub of item.child) {
      if (sub.title) OpenKeysMap[sub.path] = item.title
    }
  } else if (item.title) {
    OpenKeysMap[item.path] = 1
  }
}

export default function Sider(props) {
  const [openKeys, setOpenKeys] = useState([]);

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

  const tmp = window.location.pathname;
  const openKey = OpenKeysMap[tmp];
  if (openKey) {
    selectedKey = tmp;
    if (openKey !== 1 && !props.collapsed && !openKeys.includes(openKey)) {
      setOpenKeys([...openKeys, openKey])
    }
  }
  return (
    <Layout.Sider width={208} collapsed={props.collapsed} className={styles.sider}>
      <div className={styles.logo}>
        <img src={logo} alt="Logo"/>
      </div>
      <div className={styles.menus} style={{height: `${document.body.clientHeight - 64}px`}}>
        <Menu
          theme="dark"
          mode="inline"
          className={styles.menus}
          selectedKeys={[selectedKey]}
          openKeys={openKeys}
          onOpenChange={setOpenKeys}
          onSelect={menu => history.push(menu.key)}>
          {menus.map(menu => makeMenu(menu))}
        </Menu>
      </div>
    </Layout.Sider>
  )
}