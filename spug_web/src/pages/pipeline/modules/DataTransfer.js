/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useEffect } from 'react';
import { Form, Input, message, Card, Radio } from 'antd';
import HostSelector from 'pages/host/Selector';

function DataTransfer(props) {
  const [form] = Form.useForm()

  useEffect(() => {
    props.setHandler(() => handleSave)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSave() {
    const data = form.getFieldsValue()
    if (!data.name) return message.error('请输入节点名称')
    if (!data.condition) return message.error('请选择节点的执行条件')
    if (!data.source.path) return message.error('请输入数据源路径')
    if (!data.source.target) return message.error('请选择数据源主机')
    if (!data.destination.path) return message.error('请输入传输目标路径')
    if (!data.destination.targets) return message.error('请选择传输目标主机')
    return data
  }

  return (
    <Form layout="vertical" form={form} initialValues={props.node}>
      <Form.Item required name="name" label="节点名称">
        <Input placeholder="请输入节点名称"/>
      </Form.Item>
      <Form.Item required name="condition" label="执行条件"
                 tooltip="当该节点为流程的起始节点时（无上游节点），该条件将会被忽略。">
        <Radio.Group>
          <Radio.Button value="success">上游执行成功时</Radio.Button>
          <Radio.Button value="error">上游执行失败时</Radio.Button>
          <Radio.Button value="always">总是执行</Radio.Button>
        </Radio.Group>
      </Form.Item>
      <Card type="inner" title="数据源" style={{margin: '24px 0'}} bodyStyle={{paddingBottom: 0}}>
        <Form.Item required name={['source', 'path']} label="数据源路径"
                   tooltip="当数据源是目录时，则同步目录下的所有文件至目标路径">
          <Input placeholder="请输入数据源路径"/>
        </Form.Item>
        <Form.Item required name={['source', 'target']} label="数据源主机">
          <HostSelector onlyOne type="button"/>
        </Form.Item>
      </Card>
      <Card type="inner" title="传输目标" style={{margin: '24px 0'}} bodyStyle={{paddingBottom: 0}}>
        <Form.Item required name={['destination', 'path']} label="目标路径"
                   tooltip="当数据源是文件时，此路径以 / 结尾则同步文件至该路径下（新建或覆盖路径下的同名文件），否则该路径即为同步之后的文件路径（可理解为把源文件同步后重命名）">
          <Input placeholder="请输入目标路径"/>
        </Form.Item>
        <Form.Item required name={['destination', 'targets']} label="目标主机">
          <HostSelector type="button"/>
        </Form.Item>
      </Card>
    </Form>
  )
}

export default DataTransfer