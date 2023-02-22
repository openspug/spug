import React, { useEffect } from 'react';
import { Form, Input, Radio, message } from 'antd';
import { ACEditor } from 'components';
import HostSelector from 'pages/host/Selector';

function SSHExec(props) {
  const [form] = Form.useForm()

  useEffect(() => {
    props.setHandler(() => handleSave)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSave() {
    const data = form.getFieldsValue()
    if (!data.name) return message.error('请输入节点名称')
    if (!data.condition) return message.error('请选择节点的执行条件')
    if (!data.targets || data.targets.length === 0) return message.error('请选择执行主机')
    if (!data.interpreter) return  message.error('请选择执行解释器')
    if (!data.command) return message.error('请输入执行内容')
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
          <Radio.Button value="failure">上游执行失败时</Radio.Button>
          <Radio.Button value="always">总是执行</Radio.Button>
        </Radio.Group>
      </Form.Item>
      <Form.Item required name="targets" label="选择主机">
        <HostSelector type="button"/>
      </Form.Item>
      <Form.Item required name="interpreter" label="执行解释器">
        <Radio.Group buttonStyle="solid">
          <Radio.Button value="sh">Shell</Radio.Button>
          <Radio.Button value="python">Python</Radio.Button>
        </Radio.Group>
      </Form.Item>
      <Form.Item required label="执行内容" shouldUpdate={(p, c) => p.interpreter !== c.interpreter}>
        {({getFieldValue}) => (
          <Form.Item name="command" noStyle>
            <ACEditor
              mode={getFieldValue('interpreter')}
              width="464px"
              height="220px"/>
          </Form.Item>
        )}
      </Form.Item>
    </Form>
  )
}

export default SSHExec