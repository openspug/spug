import {useState} from 'react'
import {Outlet, useMatches, useNavigate} from 'react-router-dom'
import {Layout, Breadcrumb, Flex, Menu, theme} from 'antd'
import Header from './Header.jsx'
import {menus} from '@/routes'
import logo1 from '@/assets/logo-spug-white.png'
import logo2 from '@/assets/logo-white.png'


function LayoutIndex() {
  const [collapsed, setCollapsed] = useState(false)
  const {token: {colorBgContainer, colorTextTertiary}} = theme.useToken()
  const navigate = useNavigate()
  const matches = useMatches()
  const crumbs = matches.map(x => ({title: x.handle.crumb, href: x.pathname}))

  function handleMenuClick({key}) {
    navigate(key)
  }

  const selectedKey = matches[matches.length - 1]?.pathname
  return (
    <Layout style={{minHeight: '100vh'}}>
      <Layout.Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <Flex justify="center" align="center" style={{height: 64}}>
          {collapsed ? (
            <img src={logo2} alt="logo" style={{width: 64}}/>
          ) : (
            <img src={logo1} alt="logo" style={{width: 160, height: 32}}/>
          )}
        </Flex>
        <Menu theme="dark" mode="inline" items={menus} selectedKeys={[selectedKey]} onClick={handleMenuClick}/>
      </Layout.Sider>
      <Layout>
        <Header/>
        <Layout.Content style={{margin: '0 16px'}}>
          <Breadcrumb style={{margin: '16px 0'}} items={crumbs}/>
          <div style={{padding: 24, minHeight: 360, background: colorBgContainer}}>
            <Outlet/>
          </div>
        </Layout.Content>
        <Layout.Footer>
          <Flex justify="center" align="center" style={{color: colorTextTertiary}}>
            Copyright © 2023 OpenSpug All Rights Reserved.
          </Flex>
        </Layout.Footer>
      </Layout>
    </Layout>
  )
}

export default LayoutIndex