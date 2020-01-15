/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, Transfer, message } from 'antd';
import http from 'libs/http';
import store from './store';
import contactStore from '../contact/store';

@observer
class ComForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
    }
  }

  handleSubmit = () => {
    this.setState({loading: true});
    const formData = this.props.form.getFieldsValue();
    formData['id'] = store.record.id;
    http.post('/api/alarm/group/', formData)
      .then(res => {
        message.success('操作成功');
        store.formVisible = false;
        store.fetchRecords()
      }, () => this.setState({loading: false}))
  };

  render() {
    const info = store.record;
    const {getFieldDecorator} = this.props.form;
    return (
      <Modal
        visible
        width={800}
        maskClosable={false}
        title={store.record.id ? '编辑联系组' : '新建联系组'}
        onCancel={() => store.formVisible = false}
        confirmLoading={this.state.loading}
        onOk={this.handleSubmit}>
        <Form labelCol={{span: 6}} wrapperCol={{span: 14}}>
          <Form.Item required label="组名称">
            {getFieldDecorator('name', {initialValue: info['name']})(
              <Input placeholder="请输入联系组名称"/>
            )}
          </Form.Item>
          <Form.Item label="备注信息">
            {getFieldDecorator('desc', {initialValue: info['desc']})(
              <Input.TextArea placeholder="请输入模板备注信息"/>
            )}
          </Form.Item>
          <Form.Item required label="选择联系人">
            {getFieldDecorator('contacts', {valuePropName: 'targetKeys', initialValue: info['contacts']})(
              <Transfer
                rowKey={item => item.id}
                titles={['已有联系人', '已选联系人']}
                listStyle={{width: 199}}
                dataSource={contactStore.records}
                render={item => item.name}/>
            )}
          </Form.Item>
        </Form>
      </Modal>
    )
  }
}

export default Form.create()(ComForm)
