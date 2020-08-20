/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, Select, Col, Button, Tag, Tooltip, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import http from 'libs/http';
import store from './store';

@observer
class ComForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      password: null,
      addZone: null,
      editZone: store.record.zone,
      tags: store.record.tags || [],
      inputVisible: false,
      inputValue: '',
      editInputIndex: -1,
      editInputValue: '',
    }
  }

  handleCloseTag = removedTag => {
    const tags = this.state.tags.filter(tag => tag !== removedTag);
    this.setState({ tags });
  };

  showInputTag = () => {
    this.setState({ inputVisible: true }, () => this.input.focus());
  };

  handleInputTagChange = e => {
    this.setState({ inputValue: e.target.value });
  };

  handleInputTagConfirm = () => {
    const { inputValue } = this.state;
    let { tags } = this.state;
    if (inputValue && tags.indexOf(inputValue) === -1) {
      tags = [...tags, inputValue];
    }
    this.setState({
      tags,
      inputVisible: false,
      inputValue: '',
    });
  };

  handleEditInputChange = e => {
    this.setState({ editInputValue: e.target.value });
  };

  handleEditInputConfirm = () => {
    this.setState(({ tags, editInputIndex, editInputValue }) => {
      const newTags = [...tags];
      newTags[editInputIndex] = editInputValue;

      return {
        tags: newTags,
        editInputIndex: -1,
        editInputValue: '',
      };
    });
  };

  saveInputRef = input => {
    this.input = input;
  };

  saveEditInputRef = input => {
    this.editInput = input;
  };

  handleSubmit = () => {
    this.setState({loading: true});
    const formData = this.props.form.getFieldsValue();
    formData['id'] = store.record.id;
    formData['tags'] = this.state.tags;
    http.post('/api/host/', formData)
      .then(res => {
        if (res === 'auth fail') {
          this.setState({loading: false});
          Modal.confirm({
            icon: 'exclamation-circle',
            title: '首次验证请输入密码',
            content: this.confirmForm(formData.username),
            onOk: () => this.handleConfirm(formData),
          })
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
      formData['tags'] = this.state.tags;
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

  render() {
    const info = store.record;
    const {getFieldDecorator} = this.props.form;
    const { tags, inputVisible, inputValue, editInputIndex, editInputValue } = this.state;
    return (
      <Modal
        visible
        width={800}
        maskClosable={false}
        title={store.record.id ? '编辑主机' : '新建主机'}
        okText="验证"
        onCancel={() => store.formVisible = false}
        confirmLoading={this.state.loading}
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
          <Form.Item label="标签">
            {tags.map((tag, index) => {
              if (editInputIndex === index) {
                return (
                  <Input
                    ref={this.saveEditInputRef}
                    key={tag}
                    size="small"
                    className="tag-input"
                    value={editInputValue}
                    onChange={this.handleEditInputChange}
                    onBlur={this.handleEditInputConfirm}
                    onPressEnter={this.handleEditInputConfirm}
                  />
                );
              }

              const isLongTag = tag.length > 20;

              const tagElem = (
                <Tag
                  className="edit-tag"
                  key={tag}
                  closable={/*index !== 0*/true}
                  onClose={() => this.handleCloseTag(tag)}
                >
                  <span
                    onDoubleClick={e => {
                      if (index !== 0) {
                        this.setState({ editInputIndex: index, editInputValue: tag }, () => {
                          this.editInput.focus();
                        });
                        e.preventDefault();
                      }
                    }}
                  >
                    {isLongTag ? `${tag.slice(0, 20)}...` : tag}
                  </span>
                </Tag>
              );
              return isLongTag ? (
                <Tooltip title={tag} key={tag}>
                  {tagElem}
                </Tooltip>
              ) : (
                tagElem
              );
            })}
            {inputVisible && (
              <Input
                ref={this.saveInputRef}
                type="text"
                size="small"
                className="tag-input"
                value={inputValue}
                onChange={this.handleInputTagChange}
                onBlur={this.handleInputTagConfirm}
                onPressEnter={this.handleInputTagConfirm}
              />
            )}
            {!inputVisible && (
              <Tag className="site-tag-plus" onClick={this.showInputTag}>
                <PlusOutlined /> New Tag
              </Tag>
            )}
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
