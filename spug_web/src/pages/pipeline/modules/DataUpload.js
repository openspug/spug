/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useEffect } from 'react';
import { Form, Input, Radio, InputNumber, message } from 'antd';
import HostSelector from 'pages/host/Selector';

function DataUpload(props) {
  const [form] = Form.useForm()

  useEffect(() => {
    props.setHandler(() => handleSave)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    form.resetFields()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.node])

  function handleSave() {
    const data = form.getFieldsValue()
    if (!data.name) return message.error('请输入节点名称')
    if (!data.condition) return message.error('请选择节点的执行条件')
    if (!data.targets || data.targets.length === 0) return message.error('请选择上传目标主机')
    if (!data.path) return message.error('请输入上传路径')
    return data
  }

  return (
    <Form layout="vertical" form={form} initialValues={props.node}>
      <Form.Item required name="name" label="节点名称">
        <Input placeholder="请输入节点名称"/>
      </Form.Item>
      <Form.Item required name="condition" label="执行条件" tooltip="当该节点为流程的起始节点时（无上游节点），该条件将会被忽略。">
        <Radio.Group>
          <Radio.Button value="success">上游执行成功时</Radio.Button>
          <Radio.Button value="error">上游执行失败时</Radio.Button>
          <Radio.Button value="always">总是执行</Radio.Button>
        </Radio.Group>
      </Form.Item>
      <Form.Item required name="targets" label="选择主机" tooltip="数据将会上传到选择的主机上">
        <HostSelector type="button"/>
      </Form.Item>
      <Form.Item required name="path" label="上传路径(目录)" tooltip="文件将会上传到该目录下，同名文件将会被覆盖">
        <Input placeholder="请输入上传路径"/>
      </Form.Item>
      <Form.Item name="accept" label="文件类型限制" tooltip="限制上传的文件类型，">
        <Input placeholder="请输入接受上传的文件类型"/>
      </Form.Item>
      <Form.Item name="size" label="文件大小限制" tooltip="限制上传的文件大小，单位为MB">
        <InputNumber addonAfter="MB" placeholder="请输入文件大小限制"/>
      </Form.Item>
    </Form>
  )
}

export default DataUpload