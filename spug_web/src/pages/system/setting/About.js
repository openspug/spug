/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import styles from './index.module.css';
import { Descriptions, Spin, Icon, notification } from "antd";
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
    http.get('https://gitee.com/api/v5/repos/openspug/spug/releases/latest')
      .then(res => {
        if (res.tag_name && res.tag_name !== VERSION) {
          const logs = res.body.replace(/- */g, '');
          notification.open({
            key: 'new_version',
            duration: 0,
            top: 88,
            message: `发现新版本 ${res.tag_name}`,
            icon: <Icon type="smile" theme="twoTone"/>,
            btn: <a target="_blank" rel="noopener noreferrer" href="https://spug.dev/docs/update-version/">如何升级？</a>,
            description: <pre style={{lineHeight: '30px'}}>{logs}</pre>
          })
        }
      })
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
          <Descriptions.Item label="更新日志">
            <a href="https://spug.dev/docs/change-log/" target="_blank"
               rel="noopener noreferrer">https://spug.dev/docs/change-log/</a>
          </Descriptions.Item>
        </Descriptions>
      </Spin>
    )
  }
}

export default About
