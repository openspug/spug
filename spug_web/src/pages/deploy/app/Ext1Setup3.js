/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Form, Row, Col, Button, Radio, Icon, Tooltip, message } from "antd";
import { LinkButton } from 'components';
import Editor from 'react-ace';
import 'ace-builds/src-noconflict/mode-text';
import 'ace-builds/src-noconflict/mode-sh';
import 'ace-builds/src-noconflict/theme-tomorrow';
import store from './store';
import http from 'libs/http';
import styles from './index.module.css';
import { cleanCommand } from "../../../libs";

@observer
class Ext1Setup3 extends React.Component {
  constructor(props) {
    super(props);
    this.helpMap = {
      '2': <span>
        Spug 内置了一些全局变量，这些变量可以直接使用，请参考官方文档：
        <a target="_blank" rel="noopener noreferrer"
           href="https://spug.cc/docs/deploy-config/#%E5%85%A8%E5%B1%80%E5%8F%98%E9%87%8F">全局变量</a>
      </span>,
      '3': '在部署 Spug 的服务器上运行，可以执行任意自定义命令。',
      '4': '在部署 Spug 的服务器上运行，当前目录为检出后待发布的源代码目录，可执行任意自定义命令。',
      '5': '在发布的目标主机上运行，当前目录为目标主机上待发布的源代码目录，可执行任意自定义命令。',
      '6': '在发布的目标主机上运行，当前目录为已发布的应用目录，可执行任意自定义命令。'
    };
    this.state = {
      loading: false,
      full: ''
    }
  }

  handleSubmit = () => {
    this.setState({loading: true});
    const info = store.deploy;
    info['app_id'] = store.app_id;
    info['extend'] = '1';
    info['host_ids'] = info['host_ids'].filter(x => x);
    http.post('/api/app/deploy/', info)
      .then(() => {
        message.success('保存成功');
        store.loadDeploys(store.app_id);
        store.ext1Visible = false
      }, () => this.setState({loading: false}))
  };

  FilterLabel = (props) => (
    <div style={{display: 'inline-block', height: 39, width: 390}}>
      <span style={{float: 'left'}}>文件过滤<span style={{margin: '0 8px 0 2px'}}>:</span></span>
      <Radio.Group
        disabled={store.isReadOnly}
        style={{marginLeft: 20, float: 'left'}}
        value={props.type}
        onChange={e => store.deploy['filter_rule']['type'] = e.target.value}>
        <Radio value="contain">包含
          <Tooltip title="请输入相对于项目根目录的文件路径，仅将匹配到文件传输至要发布的目标主机。">
            <Icon type="info-circle" style={{color: '#515151', marginLeft: 8}}/>
          </Tooltip>
        </Radio>
        <Radio value="exclude">排除
          <Tooltip title="支持模糊匹配，如果路径以 / 开头则基于项目根目录匹配，匹配到文件将不会被传输。">
            <Icon type="info-circle" style={{color: '#515151', marginLeft: 8}}/>
          </Tooltip>
        </Radio>
      </Radio.Group>
      {this.state.full === '1' ? (
        <LinkButton onClick={() => this.setState({full: ''})}>退出全屏</LinkButton>
      ) : (
        <LinkButton onClick={() => this.setState({full: '1'})}>全屏</LinkButton>
      )}
    </div>
  );

  NormalLabel = (props) => (
    <div style={{display: 'inline-block', height: 39, width: 390}}>
      <span style={{float: 'left'}}>
        {props.title}<span style={{margin: '0 8px 0 2px'}}>:</span>
        <Tooltip title={this.helpMap[props.id]}>
          <Icon type="info-circle" style={{color: '#515151'}}/>
        </Tooltip>
      </span>
      {this.state.full ? (
        <span style={{color: '#1890ff', cursor: 'pointer'}} onClick={() => this.setState({full: ''})}>退出全屏</span>
      ) : (
        <span style={{color: '#1890ff', cursor: 'pointer'}} onClick={() => this.setState({full: props.id})}>全屏</span>
      )}
    </div>
  );

  render() {
    const info = store.deploy;
    const {full} = this.state;
    return (
      <React.Fragment>
        <Row>
          <Col span={11}>
            <Form.Item
              colon={false}
              className={full === '1' ? styles.fullScreen : null}
              label={<this.FilterLabel type={info['filter_rule']['type']}/>}>
              <Editor
                readOnly={store.isReadOnly}
                mode="text"
                theme="tomorrow"
                width="100%"
                height={full === '1' ? '100vh' : '100px'}
                placeholder="每行一条规则"
                value={info['filter_rule']['data']}
                onChange={v => info['filter_rule']['data'] = cleanCommand(v)}
                style={{border: '1px solid #e8e8e8'}}/>
            </Form.Item>
            <Form.Item
              colon={false}
              className={full === '3' ? styles.fullScreen : null}
              label={<this.NormalLabel title="代码检出前执行" id="3"/>}>
              <Editor
                readOnly={store.isReadOnly}
                mode="sh"
                theme="tomorrow"
                width="100%"
                height={full === '3' ? '100vh' : '100px'}
                placeholder="输入要执行的命令"
                value={info['hook_pre_server']}
                onChange={v => info['hook_pre_server'] = cleanCommand(v)}
                style={{border: '1px solid #e8e8e8'}}/>
            </Form.Item>
            <Form.Item
              colon={false}
              className={full === '5' ? styles.fullScreen : null}
              label={<this.NormalLabel title="应用发布前执行" id="5"/>}>
              <Editor
                readOnly={store.isReadOnly}
                mode="sh"
                theme="tomorrow"
                width="100%"
                height={full === '5' ? '100vh' : '100px'}
                placeholder="输入要执行的命令"
                value={info['hook_pre_host']}
                onChange={v => info['hook_pre_host'] = cleanCommand(v)}
                style={{border: '1px solid #e8e8e8'}}/>
            </Form.Item>
          </Col>
          <Col span={2}>
            <div className={styles.deployBlock} style={{marginTop: 39}}>
              <Icon type="setting" style={{fontSize: 32}}/>
              <span style={{fontSize: 12, marginTop: 5}}>基础设置</span>
            </div>
            <div className={styles.deployBlock}>
              <Icon type="gitlab" style={{fontSize: 32}}/>
              <span style={{fontSize: 12, marginTop: 5}}>检出代码</span>
            </div>
            <div className={styles.deployBlock}>
              <Icon type="swap" style={{fontSize: 32}}/>
              <span style={{fontSize: 12, marginTop: 5}}>版本切换</span>
            </div>
          </Col>
          <Col span={11}>
            <Form.Item
              colon={false}
              className={full === '2' ? styles.fullScreen : null}
              label={<this.NormalLabel title="自定义全局变量" id="2"/>}>
              <Editor
                readOnly={store.isReadOnly}
                mode="text"
                theme="tomorrow"
                width="100%"
                height={full === '2' ? '100vh' : '100px'}
                placeholder="每行一个，例如：HOME=/data/spug"
                value={info['custom_envs']}
                onChange={v => info['custom_envs'] = cleanCommand(v)}
                style={{border: '1px solid #e8e8e8'}}/>
            </Form.Item>
            <Form.Item
              colon={false}
              className={full === '4' ? styles.fullScreen : null}
              label={<this.NormalLabel title="代码检出后执行" id="4"/>}>
              <Editor
                readOnly={store.isReadOnly}
                mode="sh"
                theme="tomorrow"
                width="100%"
                height={full === '4' ? '100vh' : '100px'}
                placeholder="输入要执行的命令"
                value={info['hook_post_server']}
                onChange={v => info['hook_post_server'] = cleanCommand(v)}
                style={{border: '1px solid #e8e8e8'}}/>
            </Form.Item>
            <Form.Item
              colon={false}
              className={full === '6' ? styles.fullScreen : null}
              label={<this.NormalLabel title="应用发布后执行" id="6"/>}>
              <Editor
                readOnly={store.isReadOnly}
                mode="sh"
                theme="tomorrow"
                width="100%"
                height={full === '6' ? '100vh' : '100px'}
                placeholder="输入要执行的命令"
                value={info['hook_post_host']}
                onChange={v => info['hook_post_host'] = cleanCommand(v)}
                style={{border: '1px solid #e8e8e8'}}/>
            </Form.Item>
          </Col>
        </Row>
        <Form.Item wrapperCol={{span: 14, offset: 6}}>
          <Button disabled={store.isReadOnly} type="primary" onClick={this.handleSubmit}>提交</Button>
          <Button style={{marginLeft: 20}} onClick={() => store.page -= 1}>上一步</Button>
        </Form.Item>
      </React.Fragment>
    )
  }
}

export default Ext1Setup3
