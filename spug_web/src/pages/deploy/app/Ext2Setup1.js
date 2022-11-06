/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { Link } from 'react-router-dom';
import { Form, Switch, Select, Button, Input, Radio } from 'antd';
import envStore from 'pages/config/environment/store';
import HostSelector from 'pages/host/Selector';
import store from './store';

export default observer(function Ext2Setup1() {
  const [envs, setEnvs] = useState([]);

  function updateEnvs() {
    const ids = store.currentRecord['deploys'].map(x => x.env_id);
    setEnvs(ids.filter(x => x !== store.deploy.env_id))
  }

  useEffect(() => {
    if (store.currentRecord['deploys'] === undefined) {
      store.loadDeploys(store.app_id).then(updateEnvs)
    } else {
      updateEnvs()
    }
  }, [])

  const info = store.deploy;
  let modePlaceholder;
  switch (info['rst_notify']['mode']) {
    case '0':
      modePlaceholder = '已关闭'
      break
    case '1':
      modePlaceholder = 'https://oapi.dingtalk.com/robot/send?access_token=xxx'
      break
    case '3':
      modePlaceholder = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx'
      break
    case '4':
      modePlaceholder = 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx'
      break
    default:
      modePlaceholder = '请输入'
  }
  return (
    <Form labelCol={{span: 6}} wrapperCol={{span: 14}}>
      <Form.Item required label="发布环境" style={{marginBottom: 0}} tooltip="可以建立多个环境，实现同一应用在不同环境里配置不同的发布流程。">
        <Form.Item style={{display: 'inline-block', width: '80%'}}>
          <Select disabled={store.isReadOnly} value={info.env_id} onChange={v => info.env_id = v} placeholder="请选择发布环境">
            {envStore.records.map(item => (
              <Select.Option disabled={envs.includes(item.id)} value={item.id} key={item.id}>{item.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item style={{display: 'inline-block', width: '20%', textAlign: 'right'}}>
          <Link disabled={store.isReadOnly} to="/config/environment">新建环境</Link>
        </Form.Item>
      </Form.Item>
      <Form.Item required label="目标主机" tooltip="该发布配置作用于哪些目标主机。">
        <HostSelector value={info.host_ids} onChange={ids => info.host_ids = ids}/>
      </Form.Item>
      <Form.Item label="发布模式" tooltip="串行即发布时一台完成后再发布下一台，期间出现异常则终止发布。并行则每个主机相互独立发布同时进行。">
        <Radio.Group
          buttonStyle="solid"
          defaultValue={true}
          value={info.is_parallel}
          onChange={e => info.is_parallel = e.target.value}>
          <Radio.Button value={true}>并行</Radio.Button>
          <Radio.Button value={false}>串行</Radio.Button>
        </Radio.Group>
      </Form.Item>
      <Form.Item label="发布审核" tooltip="开启后发布申请需要审核（审核权限在系统管理/角色管理/功能权限中配置）通过后才能发布。">
        <Switch
          disabled={store.isReadOnly}
          checkedChildren="开启"
          unCheckedChildren="关闭"
          checked={info['is_audit']}
          onChange={v => info['is_audit'] = v}/>
      </Form.Item>
      <Form.Item label="消息通知" extra={<span>
        应用审核及发布成功或失败结果通知，
        <a target="_blank" rel="noopener noreferrer"
           href="https://spug.cc/docs/use-problem#use-dd">钉钉收不到通知？</a>
      </span>}>
        <Input
          addonBefore={(
            <Select disabled={store.isReadOnly}
                    value={info['rst_notify']['mode']} style={{width: 100}}
                    onChange={v => info['rst_notify']['mode'] = v}>
              <Select.Option value="0">关闭</Select.Option>
              <Select.Option value="1">钉钉</Select.Option>
              <Select.Option value="4">飞书</Select.Option>
              <Select.Option value="3">企业微信</Select.Option>
              <Select.Option value="2">Webhook</Select.Option>
            </Select>
          )}
          disabled={store.isReadOnly || info['rst_notify']['mode'] === '0'}
          value={info['rst_notify']['value']}
          onChange={e => info['rst_notify']['value'] = e.target.value}
          placeholder={modePlaceholder}/>
      </Form.Item>
      <Form.Item wrapperCol={{span: 14, offset: 6}}>
        <Button
          type="primary"
          disabled={!(info.env_id && info.host_ids.length)}
          onClick={() => store.page += 1}>下一步</Button>
      </Form.Item>
    </Form>
  )
})
