/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { ExclamationCircleOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Modal, Form, Input, Select, Button, Radio, Table, Tooltip, message } from 'antd';
import { ACEditor } from 'components';
import HostSelector from 'pages/host/Selector';
import Parameter from './Parameter';
import { http, cleanCommand } from 'libs';
import lds from 'lodash';
import S from './store';

export default observer(function () {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState(S.record.body);
  const [parameter, setParameter] = useState();
  const [parameters, setParameters] = useState([]);

  useEffect(() => {
    setParameters(S.record.parameters)
  }, [])

  function handleSubmit() {
    setLoading(true);
    const formData = form.getFieldsValue();
    formData['id'] = S.record.id;
    formData['body'] = cleanCommand(body);
    formData['host_ids'] = S.record.host_ids;
    formData['parameters'] = parameters;
    http.post('/api/exec/template/', formData)
      .then(res => {
        message.success('操作成功');
        S.formVisible = false;
        S.fetchRecords()
      }, () => setLoading(false))
  }

  function handleAddZone() {
    let type;
    Modal.confirm({
      icon: <ExclamationCircleOutlined/>,
      title: '添加模板类型',
      content: (
        <Form layout="vertical" style={{marginTop: 24}}>
          <Form.Item required label="模板类型">
            <Input onChange={e => type = e.target.value}/>
          </Form.Item>
        </Form>
      ),
      onOk: () => {
        if (type) {
          S.types.push(type);
          form.setFieldsValue({type})
        }
      },
    })
  }

  function updateParameter(data) {
    if (data.id) {
      const index = lds.findIndex(parameters, {id: data.id})
      parameters[index] = data
    } else {
      data.id = parameters.length + 1
      parameters.push(data)
    }
    setParameters([...parameters])
    setParameter(null)
  }

  function delParameter(index) {
    parameters.splice(index, 1)
    setParameters([...parameters])
  }

  const info = S.record;
  return (
    <Modal
      visible
      width={800}
      maskClosable={false}
      title={S.record.id ? '编辑模板' : '新建模板'}
      onCancel={() => S.formVisible = false}
      confirmLoading={loading}
      onOk={handleSubmit}>
      <Form form={form} initialValues={info} labelCol={{span: 6}} wrapperCol={{span: 14}}>
        <Form.Item required label="模板类型" style={{marginBottom: 0}}>
          <Form.Item name="type" style={{display: 'inline-block', width: 'calc(75%)', marginRight: 8}}>
            <Select placeholder="请选择模板类型">
              {S.types.map(item => (
                <Select.Option value={item} key={item}>{item}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item style={{display: 'inline-block', width: 'calc(25%-8px)'}}>
            <Button type="link" onClick={handleAddZone}>添加类型</Button>
          </Form.Item>
        </Form.Item>
        <Form.Item required name="name" label="模板名称">
          <Input placeholder="请输入模板名称"/>
        </Form.Item>
        <Form.Item required name="interpreter" label="脚本语言">
          <Radio.Group>
            <Radio.Button value="sh">Shell</Radio.Button>
            <Radio.Button value="python">Python</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item required label="模板内容" shouldUpdate={(p, c) => p.interpreter !== c.interpreter}>
          {({getFieldValue}) => (
            <ACEditor
              mode={getFieldValue('interpreter')}
              value={body}
              onChange={val => setBody(val)}
              height="250px"/>
          )}
        </Form.Item>
        <Form.Item label="参数化">
          {parameters.length > 0 && (
            <Table pagination={false} bordered rowKey="id" size="small" dataSource={parameters}>
              <Table.Column title="参数名" dataIndex="name"
                            render={(_, row) => <Tooltip title={row.desc}>{row.name}</Tooltip>}/>
              <Table.Column title="变量名" dataIndex="variable"/>
              <Table.Column title="操作" width={90} render={(item, _, index) => [
                <Button key="1" type="link" icon={<EditOutlined/>} onClick={() => setParameter(item)}/>,
                <Button danger key="2" type="link" icon={<DeleteOutlined/>} onClick={() => delParameter(index)}/>
              ]}>
              </Table.Column>
            </Table>
          )}
          <Button type="link" style={{padding: 0}} onClick={() => setParameter({})}>添加参数</Button>
        </Form.Item>
        <Form.Item label="目标主机">
          <HostSelector nullable value={info.host_ids} onChange={ids => info.host_ids = ids}/>
        </Form.Item>
        <Form.Item name="desc" label="备注信息">
          <Input.TextArea placeholder="请输入模板备注信息"/>
        </Form.Item>
      </Form>
      {parameter ? (
        <Parameter
          parameter={parameter}
          parameters={parameters}
          onCancel={() => setParameter(null)}
          onOk={updateParameter}/>
      ) : null}
    </Modal>
  )
})