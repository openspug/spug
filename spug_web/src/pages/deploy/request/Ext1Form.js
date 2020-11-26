/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { LoadingOutlined, SyncOutlined } from '@ant-design/icons';
import { Modal, Form, Input, Select, Button, Tag, message } from 'antd';
import hostStore from 'pages/host/store';
import http from 'libs/http';
import store from './store';
import lds from 'lodash';

export default observer(function () {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [git_type, setGitType] = useState(lds.get(store.record, 'extra.0', 'branch'));
  const [extra1, setExtra1] = useState(lds.get(store.record, 'extra.1'));
  const [extra2, setExtra2] = useState(lds.get(store.record, 'extra.2'));
  const [versions, setVersions] = useState({});
  const [host_ids, setHostIds] = useState(lds.clone(store.record.app_host_ids));

  useEffect(() => {
    fetchVersions();
    if (hostStore.records.length === 0) {
      hostStore.fetchRecords()
    }
  }, [])

  useEffect(() => {
    if (extra1 === undefined) {
      const {branches, tags} = versions;
      let [extra1, extra2] = [undefined, undefined];
      if (git_type === 'branch') {
        if (branches) {
          extra1 = _getDefaultBranch(branches);
          extra2 = lds.get(branches[extra1], '0.id')
        }
      } else {
        if (tags) {
          extra1 = lds.get(Object.keys(tags), 0)
        }
      }
      setExtra1(extra1)
      setExtra2(extra2)
    }
  }, [versions, git_type, extra1])

  function fetchVersions() {
    setFetching(true);
    http.get(`/api/app/deploy/${store.record.deploy_id}/versions/`, {timeout: 120000})
      .then(res => setVersions(res))
      .finally(() => setFetching(false))
  }

  function _getDefaultBranch(branches) {
    branches = Object.keys(branches);
    let branch = branches[0];
    for (let item of store.records) {
      if (item['deploy_id'] === store.record['deploy_id']) {
        const b = lds.get(item, 'extra.1');
        if (branches.includes(b)) {
          branch = b
        }
        break
      }
    }
    return branch
  }

  function switchType(v) {
    setExtra1(undefined);
    setGitType(v)
  }

  function switchExtra1(v) {
    setExtra1(v)
    if (git_type === 'branch') {
      setExtra2(lds.get(versions.branches[v], '0.id'))
    }
  }

  function handleSubmit() {
    if (host_ids.length === 0) {
      return message.error('请至少选择一个要发布的目标主机')
    }
    setLoading(true);
    const formData = form.getFieldsValue();
    formData['id'] = store.record.id;
    formData['deploy_id'] = store.record.deploy_id;
    formData['host_ids'] = host_ids;
    formData['extra'] = [git_type, extra1, extra2];
    http.post('/api/deploy/request/', formData)
      .then(res => {
        message.success('操作成功');
        store.ext1Visible = false;
        store.fetchRecords()
      }, () => setLoading(false))
  }

  function handleChange(id) {
    const index = host_ids.indexOf(id);
    if (index === -1) {
      setHostIds([id, ...host_ids])
    } else {
      const tmp = lds.clone(host_ids);
      tmp.splice(index, 1);
      setHostIds(tmp)
    }
  }

  const {branches, tags} = versions;
  return (
    <Modal
      visible
      width={800}
      maskClosable={false}
      title="新建发布申请"
      onCancel={() => store.ext1Visible = false}
      confirmLoading={loading}
      onOk={handleSubmit}>
      <Form form={form} initialValues={store.record} labelCol={{span: 5}} wrapperCol={{span: 17}}>
        <Form.Item required name="name" label="申请标题">
          <Input placeholder="请输入申请标题"/>
        </Form.Item>
        <Form.Item required label="选择分支/标签/版本" style={{marginBottom: 12}} extra={<span>
            根据网络情况，首次刷新可能会很慢，请耐心等待。
            <a target="_blank" rel="noopener noreferrer"
               href="https://spug.dev/docs/install-error/#%E6%96%B0%E5%BB%BA%E5%B8%B8%E8%A7%84%E5%8F%91%E5%B8%83%E7%94%B3%E8%AF%B7-git-clone-%E9%94%99%E8%AF%AF">clone 失败？</a>
          </span>}>
          <Form.Item style={{display: 'inline-block', marginBottom: 0, width: '450px'}}>
            <Input.Group compact>
              <Select value={git_type} onChange={switchType} style={{width: 100}}>
                <Select.Option value="branch">Branch</Select.Option>
                <Select.Option value="tag">Tag</Select.Option>
              </Select>
              <Select
                showSearch
                style={{width: 350}}
                value={extra1}
                placeholder="请稍等"
                onChange={switchExtra1}
                filterOption={(input, option) => option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}>
                {git_type === 'branch' ? (
                  Object.keys(branches || {}).map(b => <Select.Option key={b} value={b}>{b}</Select.Option>)
                ) : (
                  Object.entries(tags || {}).map(([tag, info]) => (
                    <Select.Option key={tag} value={tag}>{`${tag} ${info.author} ${info.message}`}</Select.Option>
                  ))
                )}
              </Select>
            </Input.Group>
          </Form.Item>
          <Form.Item style={{display: 'inline-block', width: 82, textAlign: 'center', marginBottom: 0}}>
            {fetching ? <LoadingOutlined style={{fontSize: 18, color: '#1890ff'}}/> :
              <Button type="link" icon={<SyncOutlined/>} disabled={fetching} onClick={fetchVersions}>刷新</Button>
            }
          </Form.Item>
        </Form.Item>
        {git_type === 'branch' && (
          <Form.Item required label="选择Commit ID">
            <Select value={extra2} placeholder="请选择" onChange={v => setExtra2(v)}>
              {extra1 && branches ? branches[extra1].map(item => (
                <Select.Option
                  key={item.id}>{item.id.substr(0, 6)} {item['date']} {item['author']} {item['message']}</Select.Option>
              )) : null}
            </Select>
          </Form.Item>
        )}
        <Form.Item name="desc" label="备注信息">
          <Input placeholder="请输入备注信息"/>
        </Form.Item>
        <Form.Item required label="发布目标主机" help="通过点击主机名称自由选择本次发布的主机。">
          {store.record['app_host_ids'].map(id => (
            <Tag.CheckableTag key={id} checked={host_ids.includes(id)} onChange={() => handleChange(id)}>
              {lds.get(hostStore.idMap, `${id}.name`)}({lds.get(hostStore.idMap, `${id}.hostname`)}:{lds.get(hostStore.idMap, `${id}.port`)})
            </Tag.CheckableTag>
          ))}
        </Form.Item>
      </Form>
    </Modal>
  )
})