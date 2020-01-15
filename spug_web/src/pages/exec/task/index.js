/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Form, Button, Tag } from 'antd';
import { ACEditor, AuthCard } from 'components';
import HostSelector from './HostSelector';
import TemplateSelector from './TemplateSelector';
import ExecConsole from './ExecConsole';
import store from './store';
import http from 'libs/http';

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
    http.post('/api/exec/do/', {host_ids, command: this.state.body})
      .then(store.switchConsole)
      .finally(() => this.setState({loading: false}))
  };

  render() {
    const {body, token} = this.state;
    return (
      <AuthCard auth="exec.task.do">
        <Form>
          <Form.Item label="执行主机">
            {store.hosts.map(item => (
              <Tag color="#108ee9" key={item.id}>{item.name}({item.hostname}:{item.port})</Tag>
            ))}
          </Form.Item>
          <Button icon="plus" onClick={store.switchHost}>从主机列表中选择</Button>
          <Form.Item label="执行命令">
            <ACEditor mode="sh" value={body} height="300px" onChange={body => this.setState({body})}/>
          </Form.Item>
          <Form.Item>
            <Button icon="plus" onClick={store.switchTemplate}>从执行模版中选择</Button>
          </Form.Item>
          <Button icon="thunderbolt" type="primary" onClick={this.handleSubmit}>开始执行</Button>
        </Form>
        {store.showHost && <HostSelector onCancel={store.switchHost} onOk={hosts => store.hosts = hosts}/>}
        {store.showTemplate && <TemplateSelector onCancel={store.switchTemplate} onOk={body => this.setState({body})}/>}
        {store.showConsole && <ExecConsole token={token} onCancel={store.switchConsole}/>}
      </AuthCard>
    )
  }
}

export default TaskIndex
