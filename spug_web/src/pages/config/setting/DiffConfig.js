/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Modal, Table, Row, Col, Checkbox, Form, Button, Alert } from 'antd';
import http from 'libs/http';
import envStore from '../environment/store';
import store from './store';

@observer
class Record extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      records: [],
      envs: [],
      page: 0,
      hideSame: false
    }
  }

  handleEnvCheck = (env) => {
    const index = this.state.envs.indexOf(env);
    if (index !== -1) {
      this.state.envs.splice(index, 1);
    } else {
      this.state.envs.push(env);
    }
    this.setState({envs: this.state.envs})
  };

  handleNext = () => {
    this.setState({page: this.state.page + 1, loading: true});
    const envs = this.state.envs.map(x => x.id);
    http.post('/api/config/diff/', {type: store.type, o_id: store.id, envs})
      .then(res => this.setState({records: res}))
      .finally(() => this.setState({loading: false}))
  };

  getColumns = () => {
    const columns = [{title: 'Key', dataIndex: 'key'}];
    for (let env of this.state.envs) {
      columns.push({title: `${env.name} (${env.key})`, dataIndex: env.id})
    }
    return columns
  };

  render() {
    let records = this.state.records;
    const {loading, envs, page, hideSame} = this.state;
    if (hideSame) {
      records = records.filter(item => new Set(envs.map(x => item[x.id])).size !== 1)
    }
    return (
      <Modal
        visible
        width={1000}
        maskClosable={false}
        title="对比配置"
        onCancel={() => store.diffVisible = false}
        footer={null}>
        <div style={{display: page === 0 ? 'block' : 'none'}}>
          <Alert style={{width: 500, margin: '10px auto 20px', color: '#31708f !important'}} type="info"
                 message="Tips: 通过对比配置功能，可以查看多个环境间的配置差异"/>
          <Form.Item labelCol={{span: 6}} wrapperCol={{span: 14, offset: 1}} label="要对比的环境">
            {envStore.records.map((item, index) => (
              <Row
                key={item.id}
                onClick={() => this.handleEnvCheck(item)}
                style={{cursor: 'pointer', borderTop: index ? '1px solid #e8e8e8' : ''}}>
                <Col span={2}><Checkbox checked={envs.map(x => x.id).includes(item.id)}/></Col>
                <Col span={3}>{item.key}</Col>
                <Col span={4}>{item.name}</Col>
                <Col span={15}>{item.desc}</Col>
              </Row>
            ))}
          </Form.Item>
          <Form.Item labelCol={{span: 6}} wrapperCol={{span: 14, offset: 7}}>
            <Button disabled={envs.length < 2} type="primary" onClick={this.handleNext}>下一步</Button>
          </Form.Item>
        </div>
        <div style={{display: page === 1 ? 'block' : 'none'}}>
          <Button type="link" icon="arrow-left" style={{marginRight: 20}}
                  onClick={() => this.setState({page: page - 1})}>上一步</Button>
          <Checkbox checked={hideSame} onChange={() => this.setState({hideSame: !hideSame})}>隐藏相同配置</Checkbox>
          <Table pagination={false} dataSource={records} loading={loading} columns={this.getColumns()}/>
        </div>
      </Modal>
    )
  }
}

export default Record
