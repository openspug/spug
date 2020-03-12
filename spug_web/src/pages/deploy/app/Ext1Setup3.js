/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Form, Row, Col, Button, Radio, Icon, message } from "antd";
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
    <div style={{display: 'inline-block', height: 39, width: 344}}>
      <span style={{float: 'left'}}>文件过滤<span style={{margin: '0 8px 0 2px'}}>:</span></span>
      <Radio.Group
        style={{marginLeft: 20, float: 'left'}}
        value={props.type}
        onChange={e => store.deploy['filter_rule']['type'] = e.target.value}>
        <Radio value="contain">包含</Radio>
        <Radio value="exclude">排除</Radio>
      </Radio.Group>
      {this.state.full === '1' ? (
        <LinkButton onClick={() => this.setState({full: ''})}>退出全屏</LinkButton>
      ) : (
        <LinkButton onClick={() => this.setState({full: '1'})}>全屏</LinkButton>
      )}
    </div>
  );

  NormalLabel = (props) => (
    <div style={{display: 'inline-block', height: 39, width: 344}}>
      <span style={{float: 'left'}}>{props.title}<span style={{margin: '0 8px 0 2px'}}>:</span></span>
      {this.state.full ? (
        <LinkButton onClick={() => this.setState({full: ''})}>退出全屏</LinkButton>
      ) : (
        <LinkButton type="link" onClick={() => this.setState({full: props.id})}>全屏</LinkButton>
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
              label={<this.NormalLabel title="代码迁出前执行" id="3"/>}>
              <Editor
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
              label={<this.NormalLabel title="代码迁出后执行" id="4"/>}>
              <Editor
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
          <Button type="primary" onClick={this.handleSubmit}>提交</Button>
          <Button style={{marginLeft: 20}} onClick={() => store.page -= 1}>上一步</Button>
        </Form.Item>
      </React.Fragment>
    )
  }
}

export default Ext1Setup3
