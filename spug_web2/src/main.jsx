import React from 'react'
import ReactDOM from 'react-dom/client'
import {createBrowserRouter, RouterProvider} from 'react-router-dom'
import {ConfigProvider, App, theme} from 'antd'
import routes from './routes.jsx'
import './i18n.js'


const router = createBrowserRouter(routes)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider theme={{
      algorithm: [theme.defaultAlgorithm],
      token: {
        borderRadius: 4,
      },
      components: {
        Layout: {
          headerHeight: 48,
          footerPadding: 16
        },
      },
    }}>
      <App>
        <RouterProvider router={router}/>
      </App>
    </ConfigProvider>
  </React.StrictMode>
)
