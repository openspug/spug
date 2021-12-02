/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { observer } from 'mobx-react';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { Modal, Form, Input, Select, Button, Radio, message } from 'antd';
import { ACEditor } from 'components';
import Selector from 'pages/host/Selector';
import { http, cleanCommand } from 'libs';
import store from './store';

export default observer(function () {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState(store.record.body);
  const [visible, setVisible] = useState(false);

  function handleSubmit() {
    setLoading(true);
    const formData = form.getFieldsValue();
    formData['id'] = store.record.id;
    formData['body'] = cleanCommand(body);
    formData['host_ids'] = store.record.host_ids;
    http.post('/api/exec/template/', formData)
      .then(res => {
        message.success('操作成功');
        store.formVisible = false;
        store.fetchRecords()
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
          store.types.push(type);
          form.setFieldsValue({type})
        }
      },
    })
  }

  const info = store.record;
  return (
    <Modal
      visible
      width={800}
      maskClosable={false}
      title={store.record.id ? '编辑模板' : '新建模板'}
      onCancel={() => store.formVisible = false}
      confirmLoading={loading}
      onOk={handleSubmit}>
      <Form form={form} initialValues={info} labelCol={{span: 6}} wrapperCol={{span: 14}}>
        <Form.Item required label="模板类型" style={{marginBottom: 0}}>
          <Form.Item name="type" style={{display: 'inline-block', width: 'calc(75%)', marginRight: 8}}>
            <Select placeholder="请选择模板类型">
              {store.types.map(item => (
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
              height="300px"/>
          )}
        </Form.Item>
        <Form.Item label="目标主机">
          {info.host_ids.length > 0 && <span style={{marginRight: 16}}>已选择 {info.host_ids.length} 台</span>}
          <Button type="link" style={{padding: 0}} onClick={() => setVisible(true)}>选择主机</Button>
        </Form.Item>
        <Form.Item name="desc" label="备注信息">
          <Input.TextArea placeholder="请输入模板备注信息"/>
        </Form.Item>
      </Form>
      <Selector
        visible={visible}
        selectedRowKeys={[...info.host_ids]}
        onCancel={() => setVisible(false)}
        onOk={(_, ids) => info.host_ids = ids}/>
    </Modal>
  )
})