/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { ExclamationCircleOutlined, UploadOutlined } from '@ant-design/icons';
import { Modal, Form, Input, TreeSelect, Button, Upload, Alert, message } from 'antd';
import { http, X_TOKEN, t } from 'libs';
import store from './store';
import styles from './index.module.less';

export default observer(function () {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState([]);

  useEffect(() => {
    if (store.record.pkey) {
      setFileList([{uid: '0', name: t('独立密钥'), data: store.record.pkey}])
    }
  }, [])

  function handleSubmit() {
    setLoading(true);
    const formData = form.getFieldsValue();
    formData['id'] = store.record.id;
    const file = fileList[0];
    if (file && file.data) formData['pkey'] = file.data;
    http.post('/api/host/', formData)
      .then(res => {
        if (res === 'auth fail') {
          setLoading(false)
          if (formData.pkey) {
            message.error(t('独立密钥认证失败'))
          } else {
            const onChange = v => formData.password = v;
            Modal.confirm({
              icon: <ExclamationCircleOutlined/>,
              title: t('首次验证请输入密码'),
              content: <ConfirmForm username={formData.username} onChange={onChange}/>,
              onOk: () => handleConfirm(formData),
            })
          }
        } else {
          message.success(t('验证成功'));
          store.formVisible = false;
          store.fetchRecords();
          store.fetchExtend(res.id)
        }
      }, () => setLoading(false))
  }

  function handleConfirm(formData) {
    if (formData.password) {
      return http.post('/api/host/', formData)
        .then(res => {
          message.success(t('验证成功'));
          store.formVisible = false;
          store.fetchRecords();
          store.fetchExtend(res.id)
        })
    }
    message.error(t('请输入授权密码'))
  }

  const ConfirmForm = (props) => (
    <Form layout="vertical" style={{marginTop: 24}}>
      <Form.Item required label={t('授权密码')} extra={t('用户 {} 的密码， 该密码仅做首次验证使用，不会存储该密码。', props.username)}>
        <Input.Password onChange={e => props.onChange(e.target.value)}/>
      </Form.Item>
    </Form>
  )

  function handleUploadChange(v) {
    if (v.fileList.length === 0) {
      setFileList([])
    }
  }

  function handleUpload(file, fileList) {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    http.post('/api/host/parse/', formData)
      .then(res => {
        file.data = res;
        setFileList([file])
      })
      .finally(() => setUploading(false))
    return false
  }

  const info = store.record;
  return (
    <Modal
      open
      width={700}
      maskClosable={false}
      title={store.record.id ? t('编辑主机') : t('新建主机')}
      okText={t('验证')}
      onCancel={() => store.formVisible = false}
      confirmLoading={loading}
      onOk={handleSubmit}>
      <Form form={form} labelCol={{span: 5}} wrapperCol={{span: 17}} initialValues={info}>
        <Form.Item required name="group_ids" label={t('主机分组')}>
          <TreeSelect
            multiple
            treeNodeLabelProp="name"
            treeData={store.treeData}
            showCheckedStrategy={TreeSelect.SHOW_CHILD}
            placeholder={t('请选择分组')}/>
        </Form.Item>
        <Form.Item required name="name" label={t('主机名称')}>
          <Input placeholder={t('请输入主机名称')}/>
        </Form.Item>
        <Form.Item required label={t('连接地址')} style={{marginBottom: 0}}>
          <Form.Item name="username" className={styles.formAddress1} style={{width: 'calc(30%)'}}>
            <Input addonBefore="ssh" placeholder={t('用户名')}/>
          </Form.Item>
          <Form.Item name="hostname" className={styles.formAddress2} style={{width: 'calc(40%)'}}>
            <Input addonBefore="@" placeholder={t('主机名/IP')}/>
          </Form.Item>
          <Form.Item name="port" className={styles.formAddress3} style={{width: 'calc(30%)'}}>
            <Input addonBefore="-p" placeholder={t('端口')}/>
          </Form.Item>
        </Form.Item>
        <Form.Item label={t('独立密钥')} extra={t('默认使用全局密钥，如果上传了独立密钥（私钥）则优先使用该密钥。')}>
          <Upload name="file" fileList={fileList} headers={{'X-Token': X_TOKEN}} beforeUpload={handleUpload}
                  onChange={handleUploadChange}>
            {fileList.length === 0 ? <Button loading={uploading} icon={<UploadOutlined/>}>{t('点击上传')}</Button> : null}
          </Upload>
        </Form.Item>
        <Form.Item name="desc" label={t('备注信息')}>
          <Input.TextArea placeholder={t('请输入主机备注信息')}/>
        </Form.Item>
        <Form.Item wrapperCol={{span: 17, offset: 5}}>
          <Alert showIcon type="info" message={t('首次验证时需要输入登录用户名对应的密码，该密码会用于配置SSH密钥认证，不会存储该密码。')}/>
        </Form.Item>
      </Form>
    </Modal>
  )
})
