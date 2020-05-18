/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import styles from './index.module.css';
import { Descriptions, Spin } from "antd";
import { observer } from 'mobx-react'
import { http, VERSION } from 'libs';


@observer
class About extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      fetching: true,
      info: {}
    }
  }

  componentDidMount() {
    http.get('/api/setting/about/')
      .then(res => this.setState({info: res}))
      .finally(() => this.setState({fetching: false}))
  }


  render() {
    const {info, fetching} = this.state;
    return (
      <Spin spinning={fetching}>
        <div className={styles.title}>关于</div>
        <Descriptions column={1}>
          <Descriptions.Item label="操作系统">{info['system_version']}</Descriptions.Item>
          <Descriptions.Item label="Python版本">{info['python_version']}</Descriptions.Item>
          <Descriptions.Item label="Django版本">{info['django_version']}</Descriptions.Item>
          <Descriptions.Item label="Spug API版本">{info['spug_version']}</Descriptions.Item>
          <Descriptions.Item label="Spug Web版本">{VERSION}</Descriptions.Item>
          <Descriptions.Item label="官网文档">
            <a href="https://spug.dev" target="_blank" rel="noopener noreferrer">https://spug.dev</a>
          </Descriptions.Item>
        </Descriptions>
      </Spin>
    )
  }
}

export default About
