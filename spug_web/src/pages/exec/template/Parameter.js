/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { Modal, Form, Input, Radio, Switch, message } from 'antd';
import S from './store';
import lds from 'lodash';

export default function Parameter(props) {
  const [form] = Form.useForm();

  function handleSubmit() {
    const formData = form.getFieldsValue();
    formData.id = props.parameter.id
    if (!formData.name) return message.error('请输入参数名')
    if (!formData.variable) return message.error('请输入变量名')
    if (!formData.type) return message.error('请选择参数类型')
    if (formData.type === 'select' && !formData.options) return message.error('请输入可选项')
    const tmp = lds.find(props.parameters, {variable: formData.variable})
    if (tmp && tmp.id !== formData.id) return message.error('变量名重复')
    props.onOk(formData)
  }

  return (
    <Modal
      visible
      width={600}
      maskClosable={false}
      title="编辑参数"
      onCancel={props.onCancel}
      onOk={handleSubmit}>
      <Form form={form} initialValues={props.parameter} labelCol={{span: 6}} wrapperCol={{span: 14}}>
        <Form.Item required name="name" label="参数名" tooltip="参数的简短名称。">
          <Input placeholder="请输入参数名称"/>
        </Form.Item>
        <Form.Item required name="variable" label="变量名"
                   tooltip="在脚本使用的变量名称，固定前缀_SPUG_ + 输入的变量名，例如变量名name，则最终生成环境变量为 _SPUG_name">
          <Input placeholder="请输入变量名"/>
        </Form.Item>
        <Form.Item required name="type" label="参数类型" tooltip="不同类型展示的形式不同。">
          <Radio.Group style={{width: '100%'}}>
            {Object.entries(S.ParameterTypes).map(([key, val]) => (
              <Radio.Button key={key} value={key}>{val}</Radio.Button>
            ))}
          </Radio.Group>
        </Form.Item>
        <Form.Item noStyle shouldUpdate>
          {({getFieldValue}) =>
            ['select'].includes(getFieldValue('type')) ? (
              <Form.Item required name="options" label="可选项" tooltip="每项单独一行，每行可以用英文冒号分割前边是值后边是显示的内容。">
                <Input.TextArea autoSize={{minRows: 3, maxRows: 5}} placeholder="每行一个选项，例如：&#13;&#10;test:测试环境&#13;&#10;prod:生产环境"/>
              </Form.Item>
            ) : null
          }
        </Form.Item>
        <Form.Item name="required" valuePropName="checked" label="必填" tooltip="该参数是否为必填项">
          <Switch checkedChildren="是" unCheckedChildren="否"/>
        </Form.Item>
        <Form.Item name="default" label="默认值">
          <Input placeholder="请输入"/>
        </Form.Item>
        <Form.Item name="desc" label="提示信息" tooltip="会展示在参数的输入框下方。">
          <Input placeholder="请输入该参数的帮助提示信息"/>
        </Form.Item>
      </Form>
    </Modal>
  )
}