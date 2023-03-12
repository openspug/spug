/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { observer } from 'mobx-react';
import { Button, Form, Upload, message } from 'antd';
import { ThunderboltOutlined, UploadOutlined } from '@ant-design/icons';
import Parameter from '../modules/Parameter';
import { http, X_TOKEN } from 'libs';
import S from './store';
import lds from 'lodash';

function Ask(props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  function handleOk() {
    const data = form.getFieldsValue();
    const params = {};
    for (let item of S.dynamicParams) {
      if (item.required && lds.isEmpty(data[item.variable])) {
        message.error(`请设置参数 ${item.name}`);
        return
      }
      if (item.type !== 'upload') params[item.variable] = data[item.variable]
    }
    setLoading(true)
    http.patch('/api/pipeline/do/', {id: S.record.id, token: S.token, params})
      .then(res => {
        S.dynamicParams = null
      }, () => setLoading(false))
  }

  function beforeUpload(file, size) {
    if (size) {
      const fileSize = file.size / 1024 / 1024;
      if (fileSize > size) {
        message.error(`上传文件大小不能超过 ${size}MB`);
        return Upload.LIST_IGNORE;
      }
    }
  }

  return (
    <Form form={form} labelCol={{span: 6}} wrapperCol={{span: 16}}>
      {(S.dynamicParams ?? []).map((item, idx) => item.type === 'upload' ? (
        <Form.Item key={idx} required name={item.variable} label={item.name} valuePropName="fileList"
                   getValueFromEvent={e => Array.isArray(e) ? e : e?.fileList}>
          <Upload multiple accept={item.accept} action="/api/pipeline/upload/" headers={{'X-Token': X_TOKEN}}
                  data={{token: S.token, id: item.variable}} beforeUpload={file => beforeUpload(file, item.size)}>
            <Button icon={<UploadOutlined/>}>点击上传</Button>
          </Upload>
        </Form.Item>
      ) : (
        <Form.Item key={idx} required={item.required} name={item.variable} label={item.name} tooltip={item.help}>
          <Parameter.Component data={item}/>
        </Form.Item>
      ))}
      <Form.Item wrapperCol={{offset: 6, span: 16}}>
        <Button icon={<ThunderboltOutlined/>} loading={loading} type="primary" onClick={handleOk}>开始执行</Button>
      </Form.Item>
    </Form>
  )
}

export default observer(Ask)