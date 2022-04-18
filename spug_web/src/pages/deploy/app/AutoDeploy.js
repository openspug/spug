import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, Select, Radio, Button, Alert, message } from 'antd';
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
  const [key, setKey] = useState();

  useEffect(() => {
    if (store.deploy.extend === '1') {
      fetchVersions()
    }
    http.post('/api/app/kit/key/', {key: 'api_key'})
      .then(res => setKey(res))
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

  function copyToClipBoard(data) {
    const t = document.createElement('input');
    t.value = data;
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
      <Alert showIcon type="info" style={{width: 440, margin: '0 auto 24px'}} message="Webhook可以用来与Git结合实现触发后自动发布。"/>
      <Form labelCol={{span: 6}} wrapperCol={{span: 16}}>
        <Form.Item required label="触发方式">
          <Radio.Group value={type} onChange={e => setType(e.target.value)}>
            <Radio.Button value="branch">Branch</Radio.Button>
            <Radio.Button value="tag">Tag</Radio.Button>
          </Radio.Group>
        </Form.Item>
        {store.deploy.extend === '1' ? (
          <Form.Item hidden={tagMode} required={!tagMode} label="选择分支" extra={<span>
            根据你的网络情况，首次刷新可能会很慢，请耐心等待。
            <a target="_blank" rel="noopener noreferrer"
               href="https://spug.cc/docs/use-problem#clone">刷新失败？</a>
          </span>}>
            <Form.Item style={{display: 'inline-block', marginBottom: 0, width: '246px'}}>
              <Select placeholder="仅指定分支的事件触发自动发布" value={branch} onChange={setBranch}>
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
          <Form.Item required hidden={tagMode} label="指定分支">
            <Input
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
          <Form.Item label="Webhook URL" extra="点击复制链接，目前支持Gitee、Github、Gitlab、Gogs、Coding和Codeup(阿里云)。">
            <div className={styles.webhook} onClick={() => copyToClipBoard(url)}>{url}</div>
          </Form.Item>
        )}
        {key ? (
          <Form.Item
            label="Secret Token"
            tooltip="调用该Webhook接口的访问凭据，在Gitee中为WebHook密码，Gogs中为密钥文本。"
            extra={`点击复制，老版本gitlab等无该项设置的可以在上述Webhook URL后边附加 &token=${key}`}>
            <div className={styles.webhook} onClick={() => copyToClipBoard(key)}>{key}</div>
          </Form.Item>
        ) : (
          <Form.Item label="Secret Token" tooltip="调用该Webhook接口的访问凭据，在Gitee中为WebHook密码，Gogs中为密钥文本。">
            <div style={{color: '#ff4d4f'}}>请在系统管理/系统设置/开放服务设置中设置。</div>
          </Form.Item>
        )}
      </Form>
    </Modal>
  )
})