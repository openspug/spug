/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { Form, Input, Modal, Button } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import styles from './index.module.less';
import lds from 'lodash';

function NavForm(props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState(props.record);

  function handleSubmit() {
    const formData = form.getFieldsValue();
    console.log(formData)
  }

  function add() {
    record.links.push({});
    setRecord(lds.cloneDeep(record))
  }

  function remove(index) {
    record.links.splice(index, 1);
    setRecord(lds.cloneDeep(record))
  }

  function changeLink(e, index, key) {
    record.links[index][key] = e.target.value;
    setRecord(lds.cloneDeep(record))
  }

  return (
    <Modal
      visible
      title={`${record.id ? '编辑' : '新建'}导航`}
      afterClose={() => console.log('after close')}
      onCancel={props.onCancel}
      confirmLoading={loading}
      onOk={handleSubmit}>
      <Form form={form} initialValues={record} labelCol={{span: 5}} wrapperCol={{span: 18}}>
        <Form.Item required name="title" label="导航标题">
          <Input placeholder="请输入"/>
        </Form.Item>
        <Form.Item required name="desc" label="导航描述">
          <Input placeholder="请输入"/>
        </Form.Item>
        <Form.Item required label="导航链接" style={{marginBottom: 0}}>
          {record.links.map((item, index) => (
            <div key={index} style={{display: 'flex', alignItems: 'center', marginBottom: 12}}>
              <Form.Item style={{display: 'inline-block', margin: 0, width: 100}}>
                <Input value={item.name} onChange={e => changeLink(e, index, 'name')} placeholder="链接名称"/>
              </Form.Item>
              <Form.Item style={{display: 'inline-block', width: 210, margin: '0 8px'}}>
                <Input value={item.url} onChange={e => changeLink(e, index, 'url')} placeholder="请输入链接地址"/>
              </Form.Item>
              {record.links.length > 1 && (
                <MinusCircleOutlined className={styles.minusIcon} onClick={() => remove(index)}/>
              )}
            </div>
          ))}
        </Form.Item>
        <Form.Item wrapperCol={{span: 18, offset: 5}}>
          <Button type="dashed" onClick={add} style={{width: 318}} icon={<PlusOutlined/>}>
            添加链接（推荐最多三个）
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default NavForm
