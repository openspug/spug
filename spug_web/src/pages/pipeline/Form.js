/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, Select } from 'antd';
import { t } from 'libs';
import store from './store';

function PipeForm(props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false)

  function handleSubmit() {
    setLoading(true);
    const formData = form.getFieldsValue();
    store.record = Object.assign(store.record, formData)
    store.updateRecord()
      .then(props.onCancel, () => setLoading(false))
  }

  return (
    <Modal
      open
      maskClosable={false}
      title={t('编辑流程信息')}
      onCancel={props.onCancel}
      confirmLoading={loading}
      onOk={handleSubmit}>
      <Form form={form} initialValues={store.record} layout="vertical">
        <Form.Item required name="name" label={t('流程名称')}>
          <Input placeholder={t('请输入流程名称')}/>
        </Form.Item>
        <Form.Item required name="group_id" label={t('所属分组')}>
          <Select placeholder={t('请选择所属分组')}>
            <Select.Option value="1">{t('默认分组')}</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="desc" label={t('备注信息')}>
          <Input.TextArea placeholder={t('请输入备注信息')}/>
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default observer(PipeForm)