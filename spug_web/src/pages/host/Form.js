/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, Select, Col, Button, Upload, message } from 'antd';
import { http, X_TOKEN } from 'libs';
import store from './store';

@observer
class ComForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      uploading: false,
      password: null,
      addZone: null,
      fileList: [],
      editZone: store.record.zone,
    }
  }

  componentDidMount() {
    if (store.record.pkey) {
      this.setState({
        fileList: [{uid: '0', name: '独立密钥', data: store.record.pkey}]
      })
    }
  }

  handleSubmit = () => {
    this.setState({loading: true});
    const formData = this.props.form.getFieldsValue();
    formData['id'] = store.record.id;
    const file = this.state.fileList[0];
    if (file && file.data) formData['pkey'] = file.data;
    http.post('/api/host/', formData)
      .then(res => {
        if (res === 'auth fail') {
          if (formData.pkey) {
            message.error('独立密钥认证失败')
          } else {
            this.setState({loading: false});
            Modal.confirm({
              icon: 'exclamation-circle',
              title: '首次验证请输入密码',
              content: this.confirmForm(formData.username),
              onOk: () => this.handleConfirm(formData),
            })
          }
        } else {
          message.success('操作成功');
          store.formVisible = false;
          store.fetchRecords()
        }
      }, () => this.setState({loading: false}))
  };

  handleConfirm = (formData) => {
    if (this.state.password) {
      formData['password'] = this.state.password;
      return http.post('/api/host/', formData).then(res => {
        message.success('验证成功');
        store.formVisible = false;
        store.fetchRecords()
      })
    }
    message.error('请输入授权密码')
  };

  confirmForm = (username) => {
    return (
      <Form>
        <Form.Item required label="授权密码" help={`用户 ${username} 的密码， 该密码仅做首次验证使用，不会存储该密码。`}>
          <Input.Password onChange={val => this.setState({password: val.target.value})}/>
        </Form.Item>
      </Form>
    )
  };

  handleAddZone = () => {
    this.setState({zone: ''}, () => {
      Modal.confirm({
        icon: 'exclamation-circle',
        title: '添加主机类别',
        content: (
          <Form>
            <Form.Item required label="主机类别">
              <Input onChange={e => this.setState({addZone: e.target.value})}/>
            </Form.Item>
          </Form>
        ),
        onOk: () => {
          if (this.state.addZone) {
            store.zones.push(this.state.addZone);
            this.props.form.setFieldsValue({'zone': this.state.addZone})
          }
        },
      })
    });
  };

  handleEditZone = () => {
    this.setState({zone: store.record.zone}, () => {
      Modal.confirm({
        icon: 'exclamation-circle',
        title: '编辑主机类别',
        content: (
          <Form>
            <Form.Item required label="主机类别" help="该操作将批量更新所有属于该类别的主机并立即生效，如过只是想修改单个主机的类别请使用添加类别或下拉框选择切换类别。">
              <Input defaultValue={store.record.zone} onChange={e => this.setState({editZone: e.target.value})}/>
            </Form.Item>
          </Form>
        ),
        onOk: () => http.patch('/api/host/', {id: store.record.id, zone: this.state.editZone})
          .then(res => {
            message.success(`成功修改${res}条记录`);
            store.fetchRecords();
            this.props.form.setFieldsValue({'zone': this.state.editZone})
          })
      })
    });
  };

  handleUploadChange = (v) => {
    if (v.fileList.length === 0) {
      this.setState({fileList: []})
    }
  };

  handleUpload = (file, fileList) => {
    this.setState({uploading: true});
    const formData = new FormData();
    formData.append('file', file);
    http.post('/api/host/parse/', formData)
      .then(res => {
        file.data = res;
        this.setState({fileList: [file]})
      })
      .finally(() => this.setState({uploading: false}))
    return false
  };

  render() {
    const info = store.record;
    const {fileList, loading, uploading} = this.state;
    const {getFieldDecorator} = this.props.form;
    return (
      <Modal
        visible
        width={800}
        maskClosable={false}
        title={store.record.id ? '编辑主机' : '新建主机'}
        okText="验证"
        onCancel={() => store.formVisible = false}
        confirmLoading={loading}
        onOk={this.handleSubmit}>
        <Form labelCol={{span: 6}} wrapperCol={{span: 14}}>
          <Form.Item required label="主机类别">
            <Col span={14}>
              {getFieldDecorator('zone', {initialValue: info['zone']})(
                <Select placeholder="请选择主机类别/区域/分组">
                  {store.zones.map(item => (
                    <Select.Option value={item} key={item}>{item}</Select.Option>
                  ))}
                </Select>
              )}
            </Col>
            <Col span={4} offset={1}>
              <Button type="link" onClick={this.handleAddZone}>添加类别</Button>
            </Col>
            <Col span={4} offset={1}>
              <Button type="link" onClick={this.handleEditZone}>编辑类别</Button>
            </Col>
          </Form.Item>
          <Form.Item required label="主机名称">
            {getFieldDecorator('name', {initialValue: info['name']})(
              <Input placeholder="请输入主机名称"/>
            )}
          </Form.Item>
          <Form.Item required label="连接地址" style={{marginBottom: 0}}>
            <Form.Item style={{display: 'inline-block', width: 'calc(30%)'}}>
              {getFieldDecorator('username', {initialValue: info['username']})(
                <Input addonBefore="ssh" placeholder="用户名"/>
              )}
            </Form.Item>
            <Form.Item style={{display: 'inline-block', width: 'calc(40%)'}}>
              {getFieldDecorator('hostname', {initialValue: info['hostname']})(
                <Input addonBefore="@" placeholder="主机名/IP"/>
              )}
            </Form.Item>
            <Form.Item style={{display: 'inline-block', width: 'calc(30%)'}}>
              {getFieldDecorator('port', {initialValue: info['port']})(
                <Input addonBefore="-p" placeholder="端口"/>
              )}
            </Form.Item>
          </Form.Item>
          <Form.Item label="独立密钥" extra="默认使用全局密钥，如果上传了独立密钥则优先使用该密钥。">
            <Upload name="file" fileList={fileList} headers={{'X-Token': X_TOKEN}} beforeUpload={this.handleUpload}
                    onChange={this.handleUploadChange}>
              {fileList.length === 0 ? <Button loading={uploading} icon="upload">点击上传</Button> : null}
            </Upload>
          </Form.Item>
          <Form.Item label="备注信息">
            {getFieldDecorator('desc', {initialValue: info['desc']})(
              <Input.TextArea placeholder="请输入主机备注信息"/>
            )}
          </Form.Item>
          <Form.Item wrapperCol={{span: 14, offset: 6}}>
            <span role="img" aria-label="notice">⚠️ 首次验证时需要输入登录用户名对应的密码，但不会存储该密码。</span>
          </Form.Item>
        </Form>
      </Modal>
    )
  }
}

export default Form.create()(ComForm)
