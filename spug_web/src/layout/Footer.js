/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { Layout, Icon } from 'antd';
import styles from './layout.module.css';


export default class extends React.Component {
  render() {
    return (
      <Layout.Footer style={{padding: 0}}>
        <div className={styles.footer}>
          Copyright <Icon type="copyright"/> 2019 By Open Spug
        </div>
      </Layout.Footer>
    )
  }
}
