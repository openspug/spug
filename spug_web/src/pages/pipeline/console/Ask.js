/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, {useState} from 'react';
import { observer } from 'mobx-react';
import { Button, Form } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import Parameter from '../modules/Parameter';
import { http } from 'libs';
import S from './store';

function Ask(props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  function handleOk() {
    const params = form.getFieldsValue();
    setLoading(true)
    http.patch('/api/pipeline/do/', {id: 1, params})
      .then(res => {
        S.token = res.token
        S.dynamicParams = null
      })
      .finally(() => setLoading(false))
  }

  return (
    <div hidden={S.token}>
      <Form form={form} labelCol={{span: 6}} wrapperCol={{span: 16}}>
        {(S.dynamicParams ?? []).map((item, idx) => (
          <Form.Item key={idx} required={item.required} name={item.variable} label={item.name} tooltip={item.help}>
            <Parameter.Component data={item}/>
          </Form.Item>
        ))}
        <Form.Item wrapperCol={{offset: 6, span: 16}}>
          <Button icon={<ArrowRightOutlined/>} loading={loading} type="primary" onClick={handleOk}>下一步</Button>
        </Form.Item>
      </Form>
    </div>
  )
}

export default observer(Ask)