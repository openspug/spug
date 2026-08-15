/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, Transfer, message } from 'antd';
import http from 'libs/http';
import { t } from 'libs';
import store from './store';
import contactStore from '../contact/store';

export default observer(function () {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  function handleSubmit() {
    setLoading(true);
    const formData = form.getFieldsValue();
    formData['id'] = store.record.id;
    http.post('/api/alarm/group/', formData)
      .then(res => {
        message.success(t('操作成功'));
        store.formVisible = false;
        store.fetchRecords()
      }, () => setLoading(true))
  }

  return (
    <Modal
      open
      width={800}
      maskClosable={false}
      title={store.record.id ? t('编辑联系组') : t('新建联系组')}
      onCancel={() => store.formVisible = false}
      confirmLoading={loading}
      onOk={handleSubmit}>
      <Form form={form} initialValues={store.record} labelCol={{span: 6}} wrapperCol={{span: 14}}>
        <Form.Item required name="name" label={t('组名称')}>
          <Input placeholder={t('请输入联系组名称')}/>
        </Form.Item>
        <Form.Item name="desc" label={t('备注信息')}>
          <Input.TextArea placeholder={t('请输入备注信息')}/>
        </Form.Item>
        <Form.Item required name="contacts" valuePropName="targetKeys" label={t('选择联系人')}>
          <Transfer
            rowKey={item => item.id}
            titles={[t('已有联系人'), t('已选联系人')]}
            listStyle={{width: 199}}
            dataSource={contactStore.records}
            render={item => item.name}/>
        </Form.Item>
      </Form>
    </Modal>
  )
})