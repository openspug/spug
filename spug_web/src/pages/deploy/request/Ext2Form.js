/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { UploadOutlined } from '@ant-design/icons';
import { Modal, Form, Input, Upload, DatePicker, message, Button } from 'antd';
import HostSelector from './HostSelector';
import { http, clsNames, X_TOKEN } from 'libs';
import styles from './index.module.less';
import store from './store';
import lds from 'lodash';

export default observer(function () {
  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [host_ids, setHostIds] = useState([]);
  const [plan, setPlan] = useState(store.record.plan);

  useEffect(() => {
    const {app_host_ids, host_ids, extra} = store.record;
    setHostIds(lds.clone(host_ids || app_host_ids));
    if (store.record.extra) setFileList([{...extra, uid: '0'}])
  }, [])

  function handleSubmit() {
    if (host_ids.length === 0) {
      return message.error('请至少选择一个要发布的目标主机')
    }
    setLoading(true);
    const formData = form.getFieldsValue();
    formData['id'] = store.record.id;
    formData['host_ids'] = host_ids;
    formData['type'] = store.record.type;
    formData['deploy_id'] = store.record.deploy_id;
    if (plan) formData.plan = plan.format('YYYY-MM-DD HH:mm:00');
    if (fileList.length > 0) formData['extra'] = lds.pick(fileList[0], ['path', 'name']);
    http.post('/api/deploy/request/ext2/', formData)
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
    http.post('/api/deploy/request/upload/', formData, {timeout: 300000})
      .then(res => {
        file.path = res;
        setFileList([file])
      })
      .finally(() => setUploading(false))
    return false
  }

  const {app_host_ids, deploy_id, type, require_upload} = store.record;
  return (
    <Modal
      visible
      width={700}
      maskClosable={false}
      title={`${store.record.id ? '编辑' : '新建'}发布申请`}
      onCancel={() => store.ext2Visible = false}
      confirmLoading={loading}
      onOk={handleSubmit}>
      <Form form={form} initialValues={store.record} labelCol={{span: 6}} wrapperCol={{span: 16}}>
        <Form.Item required name="name" label="申请标题">
          <Input placeholder="请输入申请标题"/>
        </Form.Item>
        <Form.Item
          name="version"
          label="SPUG_RELEASE"
          tooltip="可以在自定义脚本中引用该变量，用于设置本次发布相关的动态变量，在脚本中通过 $SPUG_RELEASE 来使用该值。">
          <Input placeholder="请输入环境变量 SPUG_RELEASE 的值"/>
        </Form.Item>
        {require_upload && (
          <Form.Item required label="上传数据" tooltip="通过数据传输动作来使用上传的文件。"
                     className={clsNames(styles.upload, fileList.length ? styles.uploadHide : null)}>
            <Upload.Dragger name="file" fileList={fileList} headers={{'X-Token': X_TOKEN}} beforeUpload={handleUpload}
                            data={{deploy_id}} onChange={handleUploadChange}>
              <Button type="link" loading={uploading} icon={<UploadOutlined/>}>点击或拖动文件至此区域上传</Button>
            </Upload.Dragger>
          </Form.Item>
        )}
        <Form.Item required label="目标主机" tooltip="可以通过创建多个发布申请单，选择主机分批发布。">
          {host_ids.length > 0 && (
            <span style={{marginRight: 16}}>已选择 {host_ids.length} 台（可选{app_host_ids.length}）</span>
          )}
          <Button type="link" style={{padding: 0}} onClick={() => setVisible(true)}>选择主机</Button>
        </Form.Item>
        <Form.Item name="desc" label="备注信息">
          <Input placeholder="请输入备注信息"/>
        </Form.Item>
        {type !== '2' && (
          <Form.Item label="定时发布" tooltip="在到达指定时间后自动发布，会有最多1分钟的延迟。">
            <DatePicker
              showTime
              value={plan}
              style={{width: 180}}
              format="YYYY-MM-DD HH:mm"
              placeholder="请设置发布时间"
              onChange={setPlan}/>
            {plan ? <span style={{marginLeft: 24, fontSize: 12, color: '#888'}}>大约 {plan.fromNow()}</span> : null}
          </Form.Item>
        )}
      </Form>
      {visible && <HostSelector
        host_ids={host_ids}
        app_host_ids={app_host_ids}
        onCancel={() => setVisible(false)}
        onOk={ids => setHostIds(ids)}/>}
    </Modal>
  )
})