/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, Switch, message } from 'antd';
import http from 'libs/http';
import store from './store';

@observer
class Approve extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
    }
  }

  handleSubmit = () => {
    this.setState({loading: true});
    const formData = this.props.form.getFieldsValue();
    http.patch(`/api/deploy/request/${store.record.id}/`, formData)
      .then(res => {
        message.success('操作成功');
        store.approveVisible = false;
        store.fetchRecords()
      }, () => this.setState({loading: false}))
  };

  render() {
    const {getFieldDecorator, getFieldValue} = this.props.form;
    return (
      <Modal
        visible
        width={600}
        maskClosable={false}
        title="审核发布申请"
        onCancel={() => store.approveVisible = false}
        confirmLoading={this.state.loading}
        onOk={this.handleSubmit}>
        <Form labelCol={{span: 6}} wrapperCol={{span: 14}}>
          <Form.Item required label="审批结果">
            {getFieldDecorator('is_pass', {initialValue: true, valuePropName: "checked"})(
              <Switch checkedChildren="通过" unCheckedChildren="驳回"/>
            )}
          </Form.Item>
          <Form.Item required={getFieldValue('is_pass') === false} label={getFieldValue('is_pass') ? '审批意见' : '驳回原因'}>
            {getFieldDecorator('reason')(
              <Input.TextArea placeholder={getFieldValue('is_pass') ? '请输入审批意见' : '请输入驳回原因'}/>
            )}
          </Form.Item>
        </Form>
      </Modal>
    )
  }
}

export default Form.create()(Approve)
