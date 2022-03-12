/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { LoadingOutlined, SyncOutlined } from '@ant-design/icons';
import { Modal, Form, Input, Select, Button, message } from 'antd';
import http from 'libs/http';
import store from './store';
import lds from 'lodash';

export default observer(function () {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [git_type, setGitType] = useState();
  const [extra, setExtra] = useState([]);
  const [extra1, setExtra1] = useState();
  const [extra2, setExtra2] = useState();
  const [versions, setVersions] = useState({});

  useEffect(() => {
    fetchVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function _setDefault(type, new_extra, new_versions) {
    const now_extra = new_extra || extra;
    const now_versions = new_versions || versions;
    const {branches, tags} = now_versions;
    if (type === 'branch') {
      let [branch, commit] = [now_extra[1], null];
      if (branches[branch]) {
        commit = lds.get(branches[branch], '0.id')
      } else {
        branch = lds.get(Object.keys(branches), 0)
        commit = lds.get(branches, `${branch}.0.id`)
      }
      setExtra1(branch)
      setExtra2(commit)
    } else {
      setExtra1(lds.get(Object.keys(tags), 0))
      setExtra2(null)
    }
  }

  function _initial(versions) {
    const {branches, tags} = versions;
    if (branches && tags) {
      for (let item of store.records) {
        if (item.deploy_id === store.deploy.id) {
          const type = item.extra[0];
          setExtra(item.extra);
          setGitType(type);
          return _setDefault(type, item.extra, versions);
        }
      }
      setGitType('branch');
      const branch = lds.get(Object.keys(branches), 0);
      const commit = lds.get(branches, `${branch}.0.id`);
      setExtra1(branch);
      setExtra2(commit)
    }
  }

  function fetchVersions() {
    setFetching(true);
    http.get(`/api/app/deploy/${store.deploy.id}/versions/`, {timeout: 120000})
      .then(res => {
        setVersions(res);
        _initial(res)
      })
      .finally(() => setFetching(false))
  }

  function switchType(v) {
    setGitType(v);
    _setDefault(v)
  }

  function switchExtra1(v) {
    setExtra1(v)
    if (git_type === 'branch') {
      setExtra2(lds.get(versions.branches[v], '0.id'))
    }
  }

  function handleSubmit() {
    setLoading(true);
    const formData = form.getFieldsValue();
    formData['deploy_id'] = store.deploy.id;
    formData['extra'] = [git_type, extra1, extra2];
    http.post('/api/repository/', formData)
      .then(res => {
        message.success('操作成功');
        store.formVisible = false;
        store.showConsole(res)
      }, () => setLoading(false))
  }

  const {branches, tags} = versions;
  return (
    <Modal
      visible
      width={800}
      maskClosable={false}
      title="新建构建"
      onCancel={() => store.formVisible = false}
      confirmLoading={loading}
      onOk={handleSubmit}>
      <Form form={form} initialValues={store.record} labelCol={{span: 5}} wrapperCol={{span: 17}}>
        <Form.Item required name="version" label="构建版本">
          <Input placeholder="请输入构建版本"/>
        </Form.Item>
        <Form.Item required label="选择分支/标签/版本" style={{marginBottom: 12}} extra={<span>
            根据网络情况，首次刷新可能会很慢，请耐心等待。
            <a target="_blank" rel="noopener noreferrer"
               href="https://spug.cc/docs/use-problem#clone">clone 失败？</a>
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
                    <Select.Option key={tag} value={tag}>
                      <div style={{display: 'flex', justifyContent: 'space-between'}}>
                        <span style={{
                          width: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>{`${tag} ${info.author} ${info.message}`}</span>
                        <span style={{color: '#999', fontSize: 12}}>{info['date']} </span>
                      </div>
                    </Select.Option>
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
                <Select.Option key={item.id}>
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{
                      width: 400,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>{item.id.substr(0, 6)} {item['author']} {item['message']}</span>
                    <span style={{color: '#999', fontSize: 12}}>{item['date']} </span>
                  </div>
                </Select.Option>
              )) : null}
            </Select>
          </Form.Item>
        )}
        <Form.Item name="remarks" label="备注信息">
          <Input placeholder="请输入备注信息"/>
        </Form.Item>
      </Form>
    </Modal>
  )
})