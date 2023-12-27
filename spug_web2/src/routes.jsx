import {FaDesktop, FaServer, FaSitemap} from 'react-icons/fa6'
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
    children: [
      {
        path: 'home',
        element: <HomeIndex/>,
        title: t('工作台'),
        icon: <FaDesktop/>,
      },
      {
        path: 'host',
        element: <HostIndex/>,
        title: t('主机管理'),
        icon: <FaServer/>
      },
      {
        path: 'exec',
        title: t('批量执行'),
        icon: <FaSitemap/>,
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

export const menus = routes2menu(routes[0].children)
export default routes