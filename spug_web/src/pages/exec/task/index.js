/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { PlusOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Form, Button, Card, Alert } from 'antd';
import { ACEditor, AuthDiv, Breadcrumb } from 'components';
import Selector from 'pages/host/Selector';
import TemplateSelector from './TemplateSelector';
import ExecConsole from './ExecConsole';
import { http, cleanCommand } from 'libs';
import store from './store';

@observer
class TaskIndex extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      body: '',
    }
  }

  componentWillUnmount() {
    store.host_ids = []
  }

  handleSubmit = () => {
    this.setState({loading: true});
    const host_ids = store.host_ids;
    http.post('/api/exec/do/', {host_ids, command: cleanCommand(this.state.body)})
      .then(store.switchConsole)
      .finally(() => this.setState({loading: false}))
  };

  render() {
    const {body, token} = this.state;
    return (
      <AuthDiv auth="exec.task.do">
        <Breadcrumb>
          <Breadcrumb.Item>首页</Breadcrumb.Item>
          <Breadcrumb.Item>批量执行</Breadcrumb.Item>
          <Breadcrumb.Item>执行任务</Breadcrumb.Item>
        </Breadcrumb>
        <Card>
          <Form layout="vertical">
            <Form.Item required label="目标主机">
              {store.host_ids.length > 0 && (
                <Alert style={{width: 200}} type="info" message={`已选择 ${store.host_ids.length} 台主机`}/>
              )}
            </Form.Item>
            <Button
              style={{marginBottom: 24}}
              icon={<PlusOutlined/>}
              onClick={() => store.showHost = true}>从主机列表中选择</Button>
            <Form.Item label="执行命令">
              <ACEditor mode="sh" value={body} height="300px" width="700px" onChange={body => this.setState({body})}/>
            </Form.Item>
            <Form.Item>
              <Button icon={<PlusOutlined/>} onClick={store.switchTemplate}>从执行模版中选择</Button>
            </Form.Item>
            <Button icon={<ThunderboltOutlined/>} type="primary" onClick={this.handleSubmit}>开始执行</Button>
          </Form>
        </Card>
        {store.showTemplate &&
        <TemplateSelector onCancel={store.switchTemplate} onOk={v => this.setState({body: body + v})}/>}
        {store.showConsole && <ExecConsole token={token} onCancel={store.switchConsole}/>}
        <Selector
          visible={store.showHost}
          selectedRowKeys={[...store.host_ids]}
          onCancel={() => store.showHost = false}
          onOk={(_, ids) => store.host_ids = ids}/>
      </AuthDiv>
    );
  }
}

export default TaskIndex
