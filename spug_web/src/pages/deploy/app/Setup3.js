import React from 'react';
import { observer } from 'mobx-react';
import { Form, Row, Col, Button, Radio, Icon, message } from "antd";
import Editor from 'react-ace';
import 'ace-builds/src-noconflict/mode-text';
import 'ace-builds/src-noconflict/mode-sh';
import 'ace-builds/src-noconflict/theme-tomorrow';
import envStore from 'pages/config/environment/store';
import store from './store';
import http from 'libs/http';
import hostStore from 'pages/host/store';
import styles from './index.module.css';

@observer
class Setup1 extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false
    }
  }

  componentDidMount() {
    if (envStore.records.length === 0) {
      envStore.fetchRecords()
    }
    if (hostStore.records.length === 0) {
      hostStore.fetchRecords()
    }
  }

  handleSubmit = () => {
    this.setState({loading: true});
    const info = store.record;
    info['extend'] = '1';
    info['host_ids'] = info['host_ids'].filter(x => x);
    http.post('/api/app/', info)
      .then(() => {
        message.success('保存成功');
        store.fetchRecords();
        store.ext1Visible = false
      }, () => this.setState({loading: false}))
  };

  FilterLabel = (props) => (
    <div style={{display: 'inline-block', height: 39}}>
      <span>文件过滤<span style={{margin: '0 8px 0 2px'}}>:</span></span>
      <Radio.Group
        style={{marginLeft: 20}}
        value={props.type}
        onChange={e => store.record['filter_rule']['type'] = e.target.value}>
        <Radio value="contain">包含</Radio>
        <Radio value="exclude">排除</Radio>
      </Radio.Group>
    </div>
  );

  render() {
    const info = store.record;
    const itemTailLayout = {
      labelCol: {span: 6},
      wrapperCol: {span: 14, offset: 6}
    };
    return (
      <React.Fragment>
        <Row>
          <Col span={11}>
            <Form.Item colon={false} label={<this.FilterLabel type={info['filter_rule']['type']}/>}>
              <Editor
                mode="text"
                theme="tomorrow"
                width="100%"
                height="100px"
                placeholder="每行一条规则"
                value={info['filter_rule']['data']}
                onChange={v => info['filter_rule']['data'] = v}
                style={{border: '1px solid #e8e8e8'}}/>
            </Form.Item>
            <Form.Item label="代码迁出前执行">
              <Editor
                mode="sh"
                theme="tomorrow"
                width="100%"
                height="100px"
                placeholder="输入要执行的命令"
                value={info['hook_pre_server']}
                onChange={v => info['hook_pre_server'] = v}
                style={{border: '1px solid #e8e8e8'}}/>
            </Form.Item>
            <Form.Item label="应用发布前执行">
              <Editor
                mode="sh"
                theme="tomorrow"
                width="100%"
                height="100px"
                placeholder="输入要执行的命令"
                value={info['hook_pre_host']}
                onChange={v => info['hook_pre_host'] = v}
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
            <Form.Item label="自定义全局变量">
              <Editor
                mode="text"
                theme="tomorrow"
                width="100%"
                height="100px"
                placeholder="每行一个，例如：HOME=/data/spug"
                value={info['custom_envs']}
                onChange={v => info['custom_envs'] = v}
                style={{border: '1px solid #e8e8e8'}}/>
            </Form.Item>
            <Form.Item label="代码迁出后执行">
              <Editor
                mode="sh"
                theme="tomorrow"
                width="100%"
                height="100px"
                placeholder="输入要执行的命令"
                value={info['hook_post_server']}
                onChange={v => info['hook_post_server'] = v}
                style={{border: '1px solid #e8e8e8'}}/>
            </Form.Item>
            <Form.Item label="应用发布后执行">
              <Editor
                mode="sh"
                theme="tomorrow"
                width="100%"
                height="100px"
                placeholder="输入要执行的命令"
                value={info['hook_post_host']}
                onChange={v => info['hook_post_host'] = v}
                style={{border: '1px solid #e8e8e8'}}/>
            </Form.Item>
          </Col>
        </Row>
        <Form.Item {...itemTailLayout}>
          <Button type="primary" onClick={this.handleSubmit}>提交</Button>
          <Button style={{marginLeft: 20}} onClick={() => store.page -= 1}>上一步</Button>
        </Form.Item>
      </React.Fragment>
    )
  }
}

export default Setup1