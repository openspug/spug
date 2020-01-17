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
        <div className={styles.footerZone}>
          <div className={styles.linksZone}>
            <a className={styles.links} title="官网" href="https://www.spug.dev"  target="_blank" >官网</a>
            <a className={styles.links} title="Github" href="https://github.com/openspug/spug"  target="_blank" >
              <Icon type="github" />
            </a>
            <a title="文档" href="https://www.spug.dev/docs/about-spug/"  target="_blank" >文档</a>
          </div>
          <text>
            Copyright <Icon type="copyright"/> 2019 By OpenSpug
          </text>
        </div>
      </Layout.Footer>
    )
  }
}
