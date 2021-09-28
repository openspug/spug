/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import styles from './index.module.css';
import { SmileTwoTone } from '@ant-design/icons';
import { Descriptions, Spin, Button, Alert, notification } from 'antd';
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
    http.get(`https://api.spug.cc/apis/release/latest/?version=${VERSION}`)
      .then(res => {
        if (res.has_new) {
          notification.open({
            key: 'new_version',
            duration: 0,
            top: 88,
            message: `发现新版本 ${res.version}`,
            icon: <SmileTwoTone/>,
            btn: <a target="_blank" rel="noopener noreferrer" href="https://spug.cc/docs/update-version/">如何升级？</a>,
            description: <pre style={{lineHeight: '30px'}}>{res.content}<br/>{res.extra}</pre>
          })
        } else if (res.extra) {
          notification.open({
            key: 'new_version',
            duration: 0,
            top: 88,
            message: `已是最新版本`,
            icon: <SmileTwoTone/>,
            btn: <Button type="link" onClick={() => notification.close('new_version')}>知道了</Button>,
            description: <pre style={{lineHeight: '30px'}}>{res.extra}</pre>
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
            <a href="https://spug.cc" target="_blank" rel="noopener noreferrer">https://spug.cc</a>
          </Descriptions.Item>
          <Descriptions.Item label="更新日志">
            <a href="https://spug.cc/docs/change-log/" target="_blank"
               rel="noopener noreferrer">https://spug.cc/docs/change-log/</a>
          </Descriptions.Item>
        </Descriptions>
        {info['spug_version'] !== VERSION && (
          <Alert showIcon style={{width: 500}} type="warning" message="Spug API版本与Web版本不匹配，请尝试刷新浏览器后再次查看。"/>
        )}
      </Spin>
    )
  }
}

export default About
