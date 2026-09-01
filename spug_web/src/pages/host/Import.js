/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Upload, Button, Tooltip, Divider, Cascader, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import Sync from './Sync';
import http from 'libs/http';
import { t } from 'libs';
import store from './store';

export default observer(function () {
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [groupId, setGroupId] = useState([]);
  const [summary, setSummary] = useState({});
  const [token, setToken] = useState();
  const [hosts, setHosts] = useState();

  function handleSubmit() {
    if (groupId.length === 0) return message.error(t('请选择要导入的分组'));
    setLoading(true);
    const formData = new FormData();
    formData.append('file', fileList[0]);
    formData.append('group_id', groupId[groupId.length - 1]);
    http.post('/api/host/import/', formData, {timeout: 120000})
      .then(res => {
        setToken(res.token)
        setHosts(res.hosts)
        setSummary(res.summary)
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

  function handleClose() {
    store.importVisible = false;
    store.fetchRecords()
  }

  return (
    <Modal
      open
      maskClosable={false}
      title={t('批量导入')}
      okText={t('导入')}
      onCancel={handleClose}
      footer={null}>
      <Form hidden={token} labelCol={{span: 6}} wrapperCol={{span: 14}}>
        <Form.Item label={t('模板下载')} extra={t('请下载使用该模板填充数据后导入')}>
          <a href="/resource/主机导入模板.xlsx">{t('主机导入模板.xlsx')}</a>
        </Form.Item>
        <Form.Item required label={t('选择分组')}>
          <Cascader
            value={groupId}
            onChange={setGroupId}
            options={store.treeData}
            fieldNames={{label: 'title'}}
            placeholder={t('请选择')}/>
        </Form.Item>
        <Form.Item required label={t('导入数据')} extra={t('Spug使用密钥认证连接服务器，导入或输入的密码仅作首次验证使用，不会存储。')}>
          <Upload
            name="file"
            accept=".xls, .xlsx"
            fileList={fileList}
            beforeUpload={() => false}
            onChange={handleUpload}>
            {fileList.length === 0 && (
              <Button><UploadOutlined/> {t('点击上传')}</Button>
            )}
          </Upload>
        </Form.Item>
        <Form.Item wrapperCol={{span: 14, offset: 6}}>
          <Button loading={loading} disabled={!fileList.length} type="primary" onClick={handleSubmit}>{t('导入主机')}</Button>
        </Form.Item>
      </Form>

      {token && hosts ? (
        <div>
          <Divider>{t('导入结果')}</Divider>
          <div style={{display: 'flex', justifyContent: 'space-around'}}>
            <div>{t('成功：')}{summary.success}</div>
            <div>{t('失败：')}{summary.fail > 0 ? (
              <Tooltip style={{color: '#6c7cff'}} title={(
                <div>
                  {summary.skip.map(x => <div key={x}>{t('第 {} 行，重复的服务器信息', x)}</div>)}
                  {summary.repeat.map(x => <div key={x}>{t('第 {} 行，重复的主机名称', x)}</div>)}
                  {summary.invalid.map(x => <div key={x}>{t('第 {} 行，无效的数据', x)}</div>)}
                </div>
              )}><span style={{color: '#6c7cff'}}>{summary.fail}</span></Tooltip>
            ) : 0}</div>
          </div>
          {Object.keys(hosts).length > 0 && (
            <>
              <Divider>{t('验证及同步')}</Divider>
              <Sync token={token} hosts={hosts} style={{maxHeight: 'calc(100vh - 400px)'}}/>
            </>
          )}
        </div>
      ) : null}
    </Modal>
  );
})
