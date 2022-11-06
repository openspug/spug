import React, { useState, useEffect } from 'react';
import { Layout, Menu } from 'antd';
import { hasPermission, history } from 'libs';
import styles from './layout.module.less';
import routes from '../routes';
import logo from './logo-spug-white.png';

let selectedKey = window.location.pathname;
const OpenKeysMap = {};
for (let item of routes) {
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
  const [menus, setMenus] = useState([]);

  useEffect(() => {
    const tmp = []
    for (let item of routes) {
      const menu = handleRoute(item)
      tmp.push(menu)
    }
    setMenus(tmp)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleRoute(item) {
    if (item.auth && !hasPermission(item.auth)) return
    if (!item.title) return;
    const menu = {label: item.title, key: item.path, icon: item.icon}
    if (item.child) {
      menu.children = []
      for (let sub of item.child) {
        const subMenu = handleRoute(sub)
        menu.children.push(subMenu)
      }
    }
    return menu
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
          items={menus}
          className={styles.menus}
          selectedKeys={[selectedKey]}
          openKeys={openKeys}
          onOpenChange={setOpenKeys}
          onSelect={menu => history.push(menu.key)}/>
      </div>
    </Layout.Sider>
  )
}