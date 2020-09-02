/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/es/locale/zh_CN';
import './index.css';
import App from './App';
import moment from 'moment';
import 'moment/locale/zh-cn';
import * as serviceWorker from './serviceWorker';
import { history, updatePermissions } from 'libs';

moment.locale('zh-cn');
updatePermissions()

ReactDOM.render(
  <Router history={history}>
    <ConfigProvider locale={zhCN}>
      <App/>
    </ConfigProvider>
  </Router>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
