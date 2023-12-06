import {AiOutlineDesktop, AiOutlineCloudServer, AiOutlineCluster} from 'react-icons/ai'
import Layout from './layout/index.jsx'
import ErrorPage from './error-page.jsx'
import LoginIndex from './pages/login/index.jsx'
import HomeIndex from './pages/home/index.jsx'
import HostIndex from './pages/host/index.jsx'
import './index.css'

let routes = [
  {
    path: '/',
    element: <Layout/>,
    errorElement: <ErrorPage/>,
    title: t('首页'),
    children: [
      {
        path: 'home',
        element: <HomeIndex/>,
        title: t('工作台'),
        icon: <AiOutlineDesktop/>,
      },
      {
        path: 'host',
        element: <HostIndex/>,
        title: t('主机管理'),
        icon: <AiOutlineCloudServer/>
      },
      {
        path: 'exec',
        title: t('批量执行'),
        icon: <AiOutlineCluster/>,
        children: [
          {
            path: 'task',
            title: t('执行任务'),
          },
          {
            path: 'transfer',
            title: t('文件分发'),
          }
        ]
      }
    ]
  },
  {
    path: '/login',
    element: <LoginIndex/>,
  },
]


function routes2menu(routes, parentPath = '') {
  const menu = []
  for (const route of routes) {
    if (!route.title) continue
    const path = `${parentPath}/${route.path}`
    if (route.children) {
      menu.push({
        key: path,
        label: route.title,
        icon: route.icon,
        children: routes2menu(route.children, path)
      })
    } else {
      menu.push({
        key: path,
        label: route.title,
        icon: route.icon,
      })
    }
  }
  return menu
}

function handle(routes) {
  for (const route of routes) {
    if (route.children) {
      route.children = handle(route.children)
    }
    route.handle = {crumb: route.title}
  }
  return routes
}

routes = handle(routes)

export const menus = routes2menu(routes[0].children)
export default routes