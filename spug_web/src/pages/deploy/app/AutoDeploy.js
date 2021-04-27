import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, Select, Radio, Button, message } from 'antd';
import { LoadingOutlined, SyncOutlined } from '@ant-design/icons';
import { http } from 'libs';
import store from './store';
import styles from './index.module.css';


export default observer(function AutoDeploy() {
  const [type, setType] = useState('branch');
  const [fetching, setFetching] = useState(false);
  const [branches, setBranches] = useState([]);
  const [branch, setBranch] = useState();
  const [url, setURL] = useState();

  useEffect(() => {
    if (store.deploy.extend === '1') {
      fetchVersions()
    }
  }, [])

  useEffect(() => {
    const prefix = window.location.origin;
    let tmp = `${prefix}/api/apis/deploy/${store.deploy.id}/${type}/`;
    if (type === 'branch') {
      tmp += `?name=${branch}`
    }
    setURL(tmp)
  }, [type, branch])

  function fetchVersions() {
    setFetching(true);
    http.get(`/api/app/deploy/${store.deploy.id}/versions/`)
      .then(res => setBranches(Object.keys(res.branches)))
      .finally(() => setFetching(false))
  }

  function copyToClipBoard() {
    const t = document.createElement('input');
    t.value = url;
    document.body.appendChild(t);
    t.select();
    document.execCommand('copy');
    t.remove();
    message.success('已复制')
  }

  const tagMode = type === 'tag';
  return (
    <Modal
      visible
      width={540}
      title="Webhook"
      footer={null}
      onCancel={() => store.autoVisible = false}>
      <Form labelCol={{span: 6}} wrapperCol={{span: 16}}>
        <Form.Item required label="触发方式">
          <Radio.Group value={type} onChange={e => setType(e.target.value)}>
            <Radio.Button value="branch">Branch</Radio.Button>
            <Radio.Button value="tag">Tag</Radio.Button>
          </Radio.Group>
        </Form.Item>
        {store.deploy.extend === '1' ? (
          <Form.Item required={!tagMode} label="选择分支" extra={<span>
            根据你的网络情况，首次刷新可能会很慢，请耐心等待。
            <a target="_blank" rel="noopener noreferrer"
               href="https://spug.dev/docs/install-error/#%E6%96%B0%E5%BB%BA%E5%B8%B8%E8%A7%84%E5%8F%91%E5%B8%83%E7%94%B3%E8%AF%B7-git-clone-%E9%94%99%E8%AF%AF">刷新失败？</a>
          </span>}>
            <Form.Item style={{display: 'inline-block', marginBottom: 0, width: '246px'}}>
              <Select disabled={tagMode} placeholder="仅指定分支的事件触发自动发布" value={branch} onChange={setBranch}>
                {branches.map(item => (
                  <Select.Option key={item} value={item}>{item}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item style={{display: 'inline-block', width: 82, textAlign: 'center', marginBottom: 0}}>
              {fetching ? <LoadingOutlined style={{fontSize: 18, color: '#1890ff'}}/> :
                <Button type="link" icon={<SyncOutlined/>} disabled={fetching || tagMode}
                        onClick={fetchVersions}>刷新</Button>
              }
            </Form.Item>
          </Form.Item>
        ) : (
          <Form.Item label="指定分支">
            <Input
              disabled={tagMode}
              value={branch}
              onChange={e => setBranch(e.target.value)}
              placeholder="仅指定分支的事件触发自动发布"/>
          </Form.Item>
        )}
        {type === 'branch' && !branch ? (
          <Form.Item label="Webhook URL">
            <div style={{color: '#ff4d4f'}}>请指定分支名称。</div>
          </Form.Item>
        ) : (
          <Form.Item label="Webhook URL" extra="点击复制链接，目前仅支持Gitee和Gitlab。">
            <div className={styles.webhook} onClick={copyToClipBoard}>{url}</div>
          </Form.Item>
        )}
      </Form>
    </Modal>
  )
})