/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { Breadcrumb } from 'antd';
import styles from './index.module.less';


export default class extends React.Component {
  static Item = Breadcrumb.Item

  render() {
    let title = this.props.title;
    if (!title) {
      const rawChildren = this.props.children;
      if (Array.isArray(rawChildren)) {
        title = rawChildren[rawChildren.length - 1].props.children
      } else {
        title = rawChildren.props.children
      }
    }

    return (
      <div className={styles.breadcrumb}>
        <Breadcrumb>
          {this.props.children}
        </Breadcrumb>
        {this.props.extra ? (
          <div className={styles.title}>
            <span>{title}</span>
            {this.props.extra}
          </div>
        ) : null}
      </div>
    )
  }
}