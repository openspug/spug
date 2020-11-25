/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { PlusOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Form, Button, Card, Tag } from 'antd';
import { ACEditor, AuthDiv, Breadcrumb } from 'components';
import HostSelector from './HostSelector';
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

  handleSubmit = () => {
    this.setState({loading: true});
    const host_ids = store.hosts.map(item => item.id);
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
            <Form.Item label="执行主机" style={{marginBottom: 12}}>
              {store.hosts.map(item => (
                <Tag
                  closable
                  color="#108ee9"
                  key={item.id}
                  onClose={() => store.hosts = store.hosts.filter(x => x.id !== item.id)}>
                  {item.name}({item.hostname}:{item.port})</Tag>
              ))}
            </Form.Item>
            <Button style={{marginBottom: 24}} icon={<PlusOutlined/>} onClick={store.switchHost}>从主机列表中选择</Button>
            <Form.Item label="执行命令">
              <ACEditor mode="sh" value={body} height="300px" onChange={body => this.setState({body})}/>
            </Form.Item>
            <Form.Item>
              <Button icon={<PlusOutlined/>} onClick={store.switchTemplate}>从执行模版中选择</Button>
            </Form.Item>
            <Button icon={<ThunderboltOutlined/>} type="primary" onClick={this.handleSubmit}>开始执行</Button>
          </Form>
        </Card>
        {store.showHost && <HostSelector onCancel={store.switchHost} onOk={hosts => store.hosts = hosts}/>}
        {store.showTemplate &&
        <TemplateSelector onCancel={store.switchTemplate} onOk={v => this.setState({body: body + v})}/>}
        {store.showConsole && <ExecConsole token={token} onCancel={store.switchConsole}/>}
      </AuthDiv>
    );
  }
}

export default TaskIndex
