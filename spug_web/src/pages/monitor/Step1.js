/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { Modal, Form, Input, Select, Button } from 'antd';
import TemplateSelector from '../exec/task/TemplateSelector';
import { LinkButton, ACEditor } from 'components';
import { http, cleanCommand, hasHostPermission } from 'libs';
import store from './store';
import hostStore from '../host/store';

const helpMap = {
  '1': '返回HTTP状态码200-399则判定为正常，其他为异常。',
  '4': '脚本执行退出状态码为 0 则判定为正常，其他为异常。'
}

export default observer(function () {
  const [loading, setLoading] = useState(false);
  const [showTmp, setShowTmp] = useState(false);

  useEffect(() => {
    const { type, addr } = store.record;
    if (type === '1' && addr) {
      store.record.sitePrefix = addr.startsWith('http://') ? 'http://' : 'https://';
      store.record.domain = store.record.addr.replace(store.record.sitePrefix, '')
    }
  }, [])

  function handleTest() {
    setLoading(true)
    const { type, sitePrefix, domain } = store.record;
    if (type === '1') store.record.addr = sitePrefix + domain;
    http.post('/api/monitor/test/', store.record, { timeout: 120000 })
      .then(res => {
        if (res.is_success) {
          Modal.success({ content: res.message })
        } else {
          Modal.warning({ content: res.message })
        }
      })
      .finally(() => setLoading(false))
  }

  function handleChangeType(v) {
    store.record.type = v;
    store.record.addr = undefined;
    store.record.extra = undefined;
  };

  function handleAddGroup() {
    Modal.confirm({
      icon: <ExclamationCircleOutlined />,
      title: '添加监控分组',
      content: (
        <Form layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item required label="监控分组">
            <Input onChange={e => store.record.group = e.target.value} />
            
          </Form.Item>
        </Form>
      ),
      onOk: () => {
        if (store.record.group) {
          store.groups.push(store.record.group);
        }
      },
    })
  }

  const SiteBefore = (
    <Select style={{ width: 90 }} value={store.record.sitePrefix} onChange={v => store.record.sitePrefix = v}>
      <Select.Option value="http://">http://</Select.Option>
      <Select.Option value="https://">https://</Select.Option>
    </Select>
  )

  function canNext() {
    const { type, addr, extra, domain, group } = store.record;
    if (type === '1') {
      return name && domain && group
    } else if (type === '5') {
      return name && addr && group
    } else {
      return name && addr && extra && group
    }
  }

  function toNext() {
    store.page += 1;
    const { type, sitePrefix, domain } = store.record;
    if (type === '1') store.record.addr = sitePrefix + domain;
  }

  function getStyle(t) {
    return t.includes(store.record.type) ? { display: 'flex' } : { display: 'none' }
  }

  const { name, desc, type, addr, extra, domain, group } = store.record;
  return (
    <Form labelCol={{ span: 6 }} wrapperCol={{ span: 14 }}>
      <Form.Item label="监控类型" help={helpMap[type]}>
        <Select placeholder="请选择监控类型" value={type} onChange={handleChangeType}>
          <Select.Option value="1">站点检测</Select.Option>
          <Select.Option value="2">端口检测</Select.Option>
          <Select.Option value="5">Ping检测</Select.Option>
          <Select.Option value="3">进程检测</Select.Option>
          <Select.Option value="4">自定义脚本</Select.Option>
        </Select>
      </Form.Item>
      <Form.Item required label="监控分组" style={{ marginBottom: 0 }}>
        <Form.Item style={{ display: 'inline-block', width: 'calc(75%)', marginRight: 8 }}>
          <Select value={group} placeholder="请选择监控分组" onChange={v => store.record.group = v}>
            {store.groups.map(item => (
              <Select.Option value={item} key={item}>{item}</Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item style={{ display: 'inline-block', width: 'calc(25%-8px)' }}>
          <Button type="link" onClick={handleAddGroup}>添加分组</Button>
        </Form.Item>
      </Form.Item>
      <Form.Item required label="监控名称">
        <Input value={name} onChange={e => store.record.name = e.target.value} placeholder="请输入监控名称" />
      </Form.Item>
      <Form.Item required label="监控地址" style={getStyle(['1'])}>
        <Input
          value={domain}
          addonBefore={SiteBefore}
          placeholder="请输入监控地址"
          onChange={e => store.record.domain = e.target.value} />
      </Form.Item>
      <Form.Item required label="监控地址" style={getStyle(['2', '5'])}>
        <Input value={addr} placeholder="请输入监控地址（IP/域名）" onChange={e => store.record.addr = e.target.value} />
      </Form.Item>
      <Form.Item required label="监控主机" style={getStyle(['3', '4'])}>
        <Select
          showSearch
          value={addr}
          placeholder="请选择主机"
          optionFilterProp="children"
          filterOption={(input, option) => option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
          onChange={v => store.record.addr = v}>
          {hostStore.records.filter(x => x.id === Number(addr) || hasHostPermission(x.id)).map(item => (
            <Select.Option value={String(item.id)} key={item.id}>
              {`${item.name}(${item.hostname}:${item.port})`}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item required label="检测端口" style={getStyle(['2'])}>
        <Input value={extra} placeholder="请输入端口号" onChange={e => store.record.extra = e.target.value} />
      </Form.Item>
      <Form.Item required label="进程名称" help="执行 ps -ef 看到的进程名称。" style={getStyle(['3'])}>
        <Input value={extra} placeholder="请输入进程名称" onChange={e => store.record.extra = e.target.value} />
      </Form.Item>
      <Form.Item
        required
        label="脚本内容"
        style={getStyle(['4'])}
        extra={<LinkButton onClick={() => setShowTmp(true)}>从模板添加</LinkButton>}>
        <ACEditor
          mode="sh"
          value={extra || ''}
          width="100%"
          height="200px"
          onChange={e => store.record.extra = cleanCommand(e)} />
      </Form.Item>
      <Form.Item label="备注信息">
        <Input.TextArea value={desc} onChange={e => store.record.desc = e.target.value} placeholder="请输入备注信息" />
      </Form.Item>

      <Form.Item wrapperCol={{ span: 14, offset: 6 }} style={{ marginTop: 12 }}>
        <Button disabled={!canNext()} type="primary" onClick={toNext}>下一步</Button>
        <Button disabled={false} type="link" loading={loading} onClick={handleTest}>执行测试</Button>
      </Form.Item>
      {showTmp && <TemplateSelector onOk={v => store.record.extra += v} onCancel={() => setShowTmp(false)} />}
    </Form>
  )
})