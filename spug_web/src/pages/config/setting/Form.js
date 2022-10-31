/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, Checkbox, Row, Col, message } from 'antd';
import http from 'libs/http';
import store from './store';
import envStore from '../environment/store'
import styles from './index.module.less';
import lds from 'lodash';

export default observer(function () {
  const isModify = store.record.id !== undefined;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [envs, setEnvs] = useState(isModify ? [store.env.id] : []);

  function handleSubmit() {
    setLoading(true);
    const formData = form.getFieldsValue();
    let request;
    if (isModify) {
      formData['id'] = store.record.id;
      request = http.patch('/api/config/', formData)
    } else {
      formData['type'] = store.type;
      formData['o_id'] = store.id;
      formData['envs'] = envs;
      request = http.post('/api/config/', formData)
    }
    request.then(res => {
      message.success('操作成功');
      store.formVisible = false;
      store.fetchRecords()
    }, () => setLoading(false))
  }

  function handleEnvCheck(id) {
    if (!isModify) {
      const tmp = lds.clone(envs);
      const index = tmp.indexOf(id);
      if (index !== -1) {
        tmp.splice(index, 1)
      } else {
        tmp.push(id)
      }
      setEnvs(tmp)
    }
  }

  return (
    <Modal
      visible
      width={800}
      maskClosable={false}
      title={store.record.id ? '更新配置' : '新增配置'}
      onCancel={() => store.formVisible = false}
      confirmLoading={loading}
      onOk={handleSubmit}>
      <Form form={form} initialValues={store.record} labelCol={{span: 6}} wrapperCol={{span: 14}}>
        <Form.Item required name="key" label="Key" tooltip="变量前缀由_SPUG_加唯一标识符组成，用于防止变量名冲突。" extra="可以由字母、数字和下划线组成。">
          <Input addonBefore={`_SPUG_${store.obj.key.toUpperCase()}_`} placeholder="请输入变量名"/>
        </Form.Item>
        <Form.Item name="value" label="Value">
          <Input.TextArea placeholder="请输入变量值"/>
        </Form.Item>
        <Form.Item name="desc" label="备注">
          <Input.TextArea placeholder="请输入备注信息"/>
        </Form.Item>
        {isModify ? null : (
          <Form.Item label="选择环境" style={{lineHeight: '40px'}} tooltip="可多选环境，复制到所有选择的环境内。">
            {envStore.records.map((item, index) => (
              <Row
                key={item.id}
                onClick={() => handleEnvCheck(item.id)}
                style={{cursor: 'pointer', borderTop: index ? '1px solid #e8e8e8' : ''}}>
                <Col span={2}><Checkbox checked={envs.includes(item.id)}/></Col>
                <Col span={10} className={styles.ellipsis}>{item.key}</Col>
                <Col span={10} className={styles.ellipsis}>{item.name}</Col>
              </Row>
            ))}
          </Form.Item>
        )}
      </Form>
    </Modal>
  )
})