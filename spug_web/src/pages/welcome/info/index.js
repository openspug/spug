/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { Menu } from 'antd';
import Basic from './Basic';
import Reset from './Reset';
import styles from './index.module.css';

class Index extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedKeys: ['basic']
    }
  }

  render() {
    const {selectedKeys} = this.state;
    return (
      <div className={styles.container}>
        <div className={styles.left}>
          <Menu
            mode="inline"
            selectedKeys={selectedKeys}
            style={{border: 'none'}}
            onSelect={({selectedKeys}) => this.setState({selectedKeys})}>
            <Menu.Item key="basic">基本设置</Menu.Item>
            <Menu.Item key="reset">修改密码</Menu.Item>
          </Menu>
        </div>
        <div className={styles.right}>
          {selectedKeys[0] === 'basic' && <Basic />}
          {selectedKeys[0] === 'reset' && <Reset />}
        </div>
      </div>
    )
  }
}

export default Index
