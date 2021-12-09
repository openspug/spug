/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { observer } from 'mobx-react';
import { UploadOutlined } from '@ant-design/icons';
import { Modal, Form, Upload, Button, Tooltip, Alert, Cascader, message } from 'antd';
import http from 'libs/http';
import store from './store';

export default observer(function () {
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [groupId, setGroupId] = useState([]);

  function handleSubmit() {
    if (groupId.length === 0) return message.error('请选择要导入的分组');
    setLoading(true);
    const formData = new FormData();
    formData.append('file', fileList[0]);
    formData.append('group_id', groupId[groupId.length - 1]);
    http.post('/api/host/import/', formData, {timeout: 120000})
      .then(res => {
        Modal.info({
          title: '导入结果',
          content: <Form labelCol={{span: 7}} wrapperCol={{span: 14}}>
            <Form.Item style={{margin: 0}} label="导入成功">{res.success.length}</Form.Item>
            {res['skip'].length > 0 && <Form.Item style={{margin: 0, color: '#1890ff'}} label="重复数据">
              <Tooltip title={`相关行：${res['skip'].join(', ')}`}>{res['skip'].length}</Tooltip>
            </Form.Item>}
            {res['invalid'].length > 0 && <Form.Item style={{margin: 0, color: '#1890ff'}} label="无效数据">
              <Tooltip title={`相关行：${res['invalid'].join(', ')}`}>{res['invalid'].length}</Tooltip>
            </Form.Item>}
            {res['repeat'].length > 0 && <Form.Item style={{margin: 0, color: '#1890ff'}} label="重复主机名">
              <Tooltip title={`相关行：${res['repeat'].join(', ')}`}>{res['repeat'].length}</Tooltip>
            </Form.Item>}
          </Form>,
          onOk: () => {
            store.fetchRecords();
            store.importVisible = false
          }
        })
      })
      .finally(() => setLoading(false))
  }

  function handleUpload(v) {
    if (v.fileList.length === 0) {
      setFileList([])
    } else {
      setFileList([v.file])
    }
  }

  return (
    <Modal
      visible
      maskClosable={false}
      title="批量导入"
      okText="导入"
      onCancel={() => store.importVisible = false}
      confirmLoading={loading}
      okButtonProps={{disabled: !fileList.length}}
      onOk={handleSubmit}>
      <Alert
        showIcon
        type="info"
        style={{width: 365, margin: '0 auto 20px'}}
        message="导入或输入的密码仅作首次验证使用，不会存储。"/>
      <Form labelCol={{span: 6}} wrapperCol={{span: 14}}>
        <Form.Item label="模板下载" extra="请下载使用该模板填充数据后导入">
          <a href="/resource/主机导入模板.xlsx">主机导入模板.xlsx</a>
        </Form.Item>
        <Form.Item required label="选择分组">
          <Cascader
            value={groupId}
            onChange={setGroupId}
            options={store.treeData}
            fieldNames={{label: 'title'}}
            placeholder="请选择"/>
        </Form.Item>
        <Form.Item required label="导入数据" extra="导入完成后可通过验证功能进行批量验证。">
          <Upload
            name="file"
            accept=".xls, .xlsx"
            fileList={fileList}
            beforeUpload={() => false}
            onChange={handleUpload}>
            {fileList.length === 0 && (
              <Button><UploadOutlined/> 点击上传</Button>
            )}
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
})
