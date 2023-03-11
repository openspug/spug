/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { observer } from 'mobx-react';
import { Button, Form, Upload } from 'antd';
import { ArrowRightOutlined, UploadOutlined } from '@ant-design/icons';
import Parameter from '../modules/Parameter';
import { http, X_TOKEN } from 'libs';
import S from './store';

function Ask(props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  function handleOk() {
    const params = form.getFieldsValue();
    setLoading(true)
    http.patch('/api/pipeline/do/', {id: 1, token: S.token, params})
      .then(res => {
        S.dynamicParams = null
      })
      .finally(() => setLoading(false))
  }

  return (
    <Form form={form} labelCol={{span: 6}} wrapperCol={{span: 16}}>
      {(S.dynamicParams ?? []).map((item, idx) => item.type === 'upload' ? (
        <Form.Item key={idx} required label={item.name}>
          <Upload multiple action="/api/pipeline/upload/" headers={{'X-Token': X_TOKEN}}
                  data={{token: S.token, id: item.id}}>
            <Button icon={<UploadOutlined/>}>点击上传</Button>
          </Upload>
        </Form.Item>
      ) : (
        <Form.Item key={idx} required={item.required} name={item.variable} label={item.name} tooltip={item.help}>
          <Parameter.Component data={item}/>
        </Form.Item>
      ))}
      <Form.Item wrapperCol={{offset: 6, span: 16}}>
        <Button icon={<ArrowRightOutlined/>} loading={loading} type="primary" onClick={handleOk}>下一步</Button>
      </Form.Item>
    </Form>
  )
}

export default observer(Ask)