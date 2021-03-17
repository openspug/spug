/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { UploadOutlined } from '@ant-design/icons';
import { Modal, Form, Input, Upload, message, Button } from 'antd';
import hostStore from 'pages/host/store';
import { http, X_TOKEN } from 'libs';
import store from './store';
import lds from 'lodash';
import HostSelector from "./HostSelector";

export default observer(function () {
  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [host_ids, setHostIds] = useState(lds.clone(store.record.app_host_ids));

  useEffect(() => {
    if (hostStore.records.length === 0) {
      hostStore.fetchRecords()
    }
    const file = lds.get(store, 'record.extra.1');
    if (file) {
      file.uid = '0';
      setFileList([file])
    }
  }, [])

  function handleSubmit() {
    if (host_ids.length === 0) {
      return message.error('请至少选择一个要发布的目标主机')
    }
    setLoading(true);
    const formData = form.getFieldsValue();
    formData['id'] = store.record.id;
    formData['deploy_id'] = store.record.deploy_id;
    formData['extra'] = [formData['extra']];
    if (fileList.length > 0) {
      formData['extra'].push(lds.pick(fileList[0], ['path', 'name']))
    }
    formData['host_ids'] = host_ids;
    http.post('/api/deploy/request/', formData)
      .then(res => {
        message.success('操作成功');
        store.ext2Visible = false;
        store.fetchRecords()
      }, () => setLoading(false))
  }

  function handleUploadChange(v) {
    if (v.fileList.length === 0) {
      setFileList([])
    }
  }

  function handleUpload(file, fileList) {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('deploy_id', store.record.deploy_id);
    http.post('/api/deploy/request/upload/', formData, {timeout: 120000})
      .then(res => {
        file.path = res;
        setFileList([file])
      })
      .finally(() => setUploading(false))
    return false
  }

  return (
    <Modal
      visible
      width={800}
      maskClosable={false}
      title="新建发布申请"
      onCancel={() => store.ext2Visible = false}
      confirmLoading={loading}
      onOk={handleSubmit}>
      <Form form={form} labelCol={{span: 6}} wrapperCol={{span: 14}}>
        <Form.Item required name="name" initialValue={store.record.name} label="申请标题">
          <Input placeholder="请输入申请标题"/>
        </Form.Item>
        <Form.Item
          name="extra"
          initialValue={lds.get(store.record, 'extra.0')}
          label="环境变量（SPUG_RELEASE）"
          help="可以在自定义脚本中引用该变量，用于设置本次发布相关的动态变量，在脚本中通过 $SPUG_RELEASE 来使用该值。">
          <Input placeholder="请输入环境变量 SPUG_RELEASE 的值"/>
        </Form.Item>
        <Form.Item label="上传数据" help="通过数据传输动作来使用上传的文件。">
          <Upload name="file" fileList={fileList} headers={{'X-Token': X_TOKEN}} beforeUpload={handleUpload}
                  data={{deploy_id: store.record.deploy_id}} onChange={handleUploadChange}>
            {fileList.length === 0 ? <Button loading={uploading} icon={<UploadOutlined/>}>点击上传</Button> : null}
          </Upload>
        </Form.Item>
        <Form.Item required label="目标主机" help="可以通过创建多个发布申请单，选择主机分批发布。">
          {host_ids.length > 0 && `已选择 ${host_ids.length} 台`}
          <Button type="link" onClick={() => setVisible(true)}>选择主机</Button>
        </Form.Item>
      </Form>
      {visible && <HostSelector
        host_ids={host_ids}
        app_host_ids={store.record.app_host_ids}
        onCancel={() => setVisible(false)}
        onOk={ids => setHostIds(ids)}/>}
    </Modal>
  )
})