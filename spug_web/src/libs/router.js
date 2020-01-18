/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React, { Suspense } from 'react';
import { Switch, Route } from 'react-router-dom';
import moduleRoutes from '../routes';
import styles from './libs.module.css';


// 创建单个路由
export function makeRoute(path, component) {
  return {subPath: path, component}
}

// 创建模块路由
export function makeModuleRoute(prefix, routes) {
  return {prefix, routes}
}

// 404 页面
function NotFound() {
  return (
    <div className={styles.container}>
      <div className={styles.imgBlock}>
        <div className={styles.img}/>
      </div>
      <div>
        <h1 className={styles.title}>404</h1>
        <div className={styles.desc}>抱歉，你访问的页面不存在</div>
      </div>
    </div>
  )
}

// 组合路由
export class Router extends React.Component {
  constructor(props) {
    super(props);
    this.routes = [];
    this.initialRoutes();
  }

  initialRoutes() {
    for (let moduleRoute of moduleRoutes) {
      for (let route of moduleRoute['routes']) {
        route['path'] = moduleRoute['prefix'] + route['subPath'];
        this.routes.push(route)
      }
    }
  }

  render() {
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <Switch>
          {this.routes.map(route => <Route exact strict key={route.path} {...route}/>)}
          <Route component={NotFound}/>
        </Switch>
      </Suspense>
    )
  }
}
