import React from 'react';
import { Breadcrumb } from 'antd';
import menus from '../menus';
import styles from './index.module.css';

export default class extends React.Component {
  constructor(props) {
    super(props);
    this.lastPath = window.location.pathname;
    const breadInfo = this.assembleMenu(this.lastPath)
    this.state = {
      breadInfo
    }
  }

  assembleMenu(currentPath) {
    const menu = []
    if (Array.isArray(menu)) {
      menus.forEach(item => {
        if (!item) return false;
        if (item.path === currentPath) {
          menu.push({
            title: item.title
          })
        } else {
          if (Array.isArray(item.child)) {
            item.child.forEach(itemChild => {
              if (itemChild.path === currentPath) {
                menu.push({
                  title: item.title
                }, {
                  title: itemChild.title
                })
              }
            })
          }
        }
      })
    }
    return menu
  }

  componentDidUpdate() {
    const currentPath = window.location.pathname;
    if (this.lastPath !== currentPath) {
      const breadInfo = this.assembleMenu(currentPath)
      this.setState({
        breadInfo
      });
    }
  }

  render() {
    const { breadcrumbs, children } = this.props;
    const { breadInfo } = this.state;
    return (
      <div className={styles.breadWrapper}>
        {(!!breadInfo.length || (breadcrumbs && breadcrumbs.length > 0)) && (
          <div className={styles.breadStyle}>
            <Breadcrumb>
              {
                (breadcrumbs ? breadcrumbs : breadInfo).map(item => {
                  return (
                    <Breadcrumb.Item key={item.title}>
                      {
                        item.href ? (<a href={item.href}>{item.title}</a>) : item.title
                      }
                    </Breadcrumb.Item>
                  )
                })
              }
            </Breadcrumb>
          </div>
        )}
        <div className={styles.router}>{children}</div>
      </div>
    )
  }
}