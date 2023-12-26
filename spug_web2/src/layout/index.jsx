import {useState} from 'react'
import {Outlet, useMatches, useNavigate} from 'react-router-dom'
import {Layout, Flex, Menu, theme} from 'antd'
import Header from './Header.jsx'
import {menus} from '@/routes'
import css from './index.module.scss'


function LayoutIndex() {
  const [collapsed, setCollapsed] = useState(false);
  const {token: {colorTextTertiary}} = theme.useToken()
  const navigate = useNavigate()
  const matches = useMatches()

  function handleMenuClick({key}) {
    navigate(key)
  }

  const selectedKey = matches[matches.length - 1]?.pathname
  return (
    <Layout style={{minHeight: '100vh'}}>
      <Header/>
      <Layout>
        <div style={{width: collapsed ? 80 : 200, transition: 'all 0.2s'}}/>
        <Layout.Sider theme="light" collapsible className={css.sider} collapsed={collapsed} onCollapse={setCollapsed}>
          <Menu mode="inline" items={menus} selectedKeys={[selectedKey]}
                onClick={handleMenuClick}/>
        </Layout.Sider>
        <Layout.Content style={{margin: '64px 16px 0 16px'}}>
          <div style={{minHeight: 'calc(100vh - 64px - 54px'}}>
            <Outlet/>
          </div>
          <Layout.Footer>
            <Flex justify="center" align="center" style={{color: colorTextTertiary}}>
              Copyright © 2023 OpenSpug All Rights Reserved.
            </Flex>
          </Layout.Footer>
        </Layout.Content>
      </Layout>
    </Layout>
  )
}

export default LayoutIndex