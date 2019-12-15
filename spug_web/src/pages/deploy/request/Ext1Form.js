import React from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, Select, Col, Button, Tag, message } from 'antd';
import hostStore from 'pages/host/store';
import http from 'libs/http';
import store from './store';
import lds from 'lodash';

@observer
class Ext1Form extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      fetching: true,
      git_type: 'branch',
      extra1: undefined,
      extra2: undefined,
      versions: {},
      host_ids: store.record['host_ids'].concat()
    }
  }

  componentDidMount() {
    this.fetchVersions()
  }

  fetchVersions = () => {
    this.setState({fetching: true});
    http.get(`/api/app/${store.record.id}/versions/`)
      .then(res => {
        this.setState({versions: res}, this._initExtra1);
      })
      .finally(() => this.setState({fetching: false}))
  };

  _initExtra1 = () => {
    const {git_type, versions: {branches, tags}} = this.state;
    let extra1 = undefined;
    if (git_type === 'branch') {
      if (branches) {
        extra1 = lds.get(Object.keys(branches), 0)
      }
    } else {
      if (tags) {
        extra1 = lds.get(Object.keys(tags), 0)
      }
    }
    this.setState({extra1})
  };

  switchType = (v) => {
    this.setState({git_type: v}, this._initExtra1)
  };

  handleSubmit = () => {
    if (this.state.host_ids.length === 0) {
      return message.error('请至少选择一个要发布的目标主机')
    }
    this.setState({loading: true});
    const formData = this.props.form.getFieldsValue();
    formData['id'] = store.record.id;
    formData['body'] = this.state.body;
    http.post('/api/exec/template/', formData)
      .then(res => {
        message.success('操作成功');
        store.formVisible = false;
        store.fetchRecords()
      }, () => this.setState({loading: false}))
  };

  handleChange = (id, v) => {
    const host_ids = this.state.host_ids;
    const index = host_ids.indexOf(id);
    if (index === -1) {
      this.setState({host_ids: [id, ...host_ids]})
    } else {
      host_ids.splice(index, 1);
      this.setState({host_ids})
    }
  };

  render() {
    const info = store.record;
    const {host_ids, git_type, extra1, fetching, versions: {branches, tags}} = this.state;
    const {getFieldDecorator} = this.props.form;
    return (
      <Modal
        visible
        width={800}
        maskClosable={false}
        title="新建发布申请"
        onCancel={() => store.ext1Visible = false}
        confirmLoading={this.state.loading}
        onOk={this.handleSubmit}>
        <Form labelCol={{span: 5}} wrapperCol={{span: 17}}>
          <Form.Item required label="申请标题">
            {getFieldDecorator('name', {initialValue: info['name']})(
              <Input placeholder="请输入申请标题"/>
            )}
          </Form.Item>
          <Form.Item required label="选择分支/标签/版本" help="根据网络情况，刷新可能会很慢，请耐心等待。">
            <Col span={19}>
              <Input.Group compact>
                <Select value={git_type} onChange={this.switchType} style={{width: 100}}>
                  <Select.Option value="branch">Branch</Select.Option>
                  <Select.Option value="tag">Tag</Select.Option>
                </Select>
                <Select
                  value={extra1}
                  style={{width: 320}}
                  loading={fetching}
                  placeholder="请稍等"
                  onChange={v => this.setState({extra1: v})}>
                  {git_type === 'branch' ? (
                    Object.keys(branches || {}).map(b => <Select.Option key={b} value={b}>{b}</Select.Option>)
                  ) : (
                    Object.entries(tags || {}).map(([tag, info]) => (
                      <Select.Option key={tag} value={tag}>{tag} {info.author}</Select.Option>
                    ))
                  )}
                </Select>
              </Input.Group>
            </Col>
            <Col span={4} offset={1}>
              <Button type="link" icon="sync" disabled={fetching} onClick={this.fetchVersions}>刷新</Button>
            </Col>
          </Form.Item>
          {git_type === 'branch' && (
            <Form.Item required label="选择Commit ID">
              {getFieldDecorator('extra2')(
                <Select placeholder="请选择">
                  {extra1 ? branches[extra1].map(item => (
                    <Select.Option
                      key={item.id}>{item.id.substr(0, 6)} {item['date']} {item['author']} {item['message']}</Select.Option>
                  )): null}
                </Select>
              )}
            </Form.Item>
          )}
          <Form.Item label="备注信息">
            {getFieldDecorator('desc', {initialValue: info['desc']})(
              <Input placeholder="请输入备注信息"/>
            )}
          </Form.Item>
          <Form.Item required label="发布目标主机">
            {info['host_ids'].map(id => (
              <Tag.CheckableTag key={id} checked={host_ids.includes(id)} onChange={v => this.handleChange(id, v)}>
                {lds.get(hostStore.idMap, `${id}.name`)}({lds.get(hostStore.idMap, `${id}.hostname`)}:{lds.get(hostStore.idMap, `${id}.port`)})
              </Tag.CheckableTag>
            ))}
          </Form.Item>
        </Form>
      </Modal>
    )
  }
}

export default Form.create()(Ext1Form)