import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { ConfigProvider, App as AntdApp, theme } from 'antd'
import { IconContext } from 'react-icons'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import dayjs from 'dayjs'
import routes from './routes.jsx'
import { app, SContext } from '@/libs'
import { useImmer } from 'use-immer'
import './i18n.js'

dayjs.locale(app.lang)

const router = createBrowserRouter(routes)

function App() {
  const [S, updateS] = useImmer({ theme: app.theme })

  return (
    <SContext.Provider value={{ S, updateS }}>
      <ConfigProvider
        locale={app.lang === 'en' ? enUS : zhCN}
        theme={{
          cssVar: true,
          hashed: false,
          algorithm: S.theme === 'dark' ? theme.darkAlgorithm : null,
          token: {
            borderRadius: 4,
            padding: 12,
            paddingLG: 16,
            controlHeight: 30,
          },
          components: {
            Layout: {
              headerHeight: 48,
              footerPadding: 16
            },
            Tree: {
              titleHeight: 30
            }
          },
        }}>
        <IconContext.Provider value={{ className: 'anticon' }}>
          <AntdApp>
            <RouterProvider router={router} />
          </AntdApp>
        </IconContext.Provider>
      </ConfigProvider>
    </SContext.Provider>
  )
}

export default App