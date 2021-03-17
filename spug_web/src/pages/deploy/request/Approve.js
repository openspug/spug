/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, Switch, message } from 'antd';
import http from 'libs/http';
import store from './store';
import styles from './index.module.less';

export default observer(function () {
  const [form] = Form.useForm();
  const [isPass, setIsPass] = useState(true);
  const [loading, setLoading] = useState(false);

  function handleSubmit() {
    setLoading(true);
    const formData = form.getFieldsValue();
    http.patch(`/api/deploy/request/${store.record.id}/`, formData)
      .then(res => {
        message.success('操作成功');
        store.approveVisible = false;
        store.fetchRecords()
      }, () => setLoading(false))
  }

  function handleChange(val) {
    if (val.is_pass !== undefined) {
      setIsPass(val.is_pass)
    }
  }
  return (
    <Modal
      visible
      width={600}
      maskClosable={false}
      title="审核发布申请"
      onCancel={() => store.approveVisible = false}
      confirmLoading={loading}
      className={styles.approve}
      onOk={handleSubmit}>
      <Form form={form} labelCol={{span: 6}} wrapperCol={{span: 14}} onValuesChange={handleChange}>
        <Form.Item required name="is_pass" initialValue={true} valuePropName="checked" label="审批结果">
          <Switch checkedChildren="通过" unCheckedChildren="驳回"/>
        </Form.Item>
        <Form.Item name="reason" required={isPass === false} label={isPass ? '审批意见' : '驳回原因'}>
          <Input.TextArea placeholder={isPass ? '请输入审批意见' : '请输入驳回原因'}/>
        </Form.Item>
      </Form>
    </Modal>
  )
})