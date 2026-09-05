/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, InputNumber, Radio, Switch, Button, message } from 'antd';
import http from 'libs/http';
import { t } from 'libs';
import store from './store';

// 对象 → 文本域展示；文本域 → 对象提交
function toText(obj) {
  return obj ? JSON.stringify(obj, null, 2) : ''
}

function parseJson(text, label) {
  if (!text || !text.trim()) return null;
  try {
    const value = JSON.parse(text);
    if (typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value
  } catch (e) {
    throw new Error(t('{} 必须是合法的 JSON 对象', label))
  }
}

export default observer(function () {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [type, setType] = useState(store.mcpRecord.type || 'docker');

  function _formData() {
    const formData = form.getFieldsValue();
    formData['env'] = parseJson(formData.env, t('环境变量'));
    formData['headers'] = parseJson(formData.headers, t('请求头'));
    if (formData.type === 'docker' && !formData.image) throw new Error(t('请输入Docker镜像'));
    if (formData.type === 'http' && !formData.url) throw new Error(t('请输入服务地址'));
    return formData
  }

  function handleSubmit() {
    let formData;
    try {
      formData = _formData()
    } catch (e) {
      return message.error(e.message)
    }
    setLoading(true);
    formData['id'] = store.mcpRecord.id;
    http.post('/api/ai/mcp/', formData)
      .then(() => {
        message.success(t('操作成功'));
        store.mcpFormVisible = false;
        store.fetchMcpRecords()
      }, () => setLoading(false))
  }

  function handleTest() {
    let formData;
    try {
      formData = _formData()
    } catch (e) {
      return message.error(e.message)
    }
    setTesting(true);
    formData['id'] = store.mcpRecord.id;
    http.post('/api/ai/mcp/test/', formData, {timeout: 300000})
      .then(res => {
        message.success(t('连接正常，发现 {} 个工具', (res.tools || []).length));
        if (store.mcpRecord.id) store.fetchMcpRecords()
      })
      .finally(() => setTesting(false))
  }

  return (
    <Modal
      open
      width={640}
      maskClosable={false}
      title={store.mcpRecord.id ? t('编辑MCP服务') : t('新建MCP服务')}
      onCancel={() => store.mcpFormVisible = false}
      footer={[
        <Button key="test" loading={testing} onClick={handleTest}>{t('连接测试')}</Button>,
        <Button key="cancel" onClick={() => store.mcpFormVisible = false}>{t('取消')}</Button>,
        <Button key="ok" type="primary" loading={loading} onClick={handleSubmit}>{t('确定')}</Button>,
      ]}>
      <Form form={form} labelCol={{span: 6}} wrapperCol={{span: 16}}
            initialValues={{...store.mcpRecord, env: toText(store.mcpRecord.env), headers: toText(store.mcpRecord.headers)}}>
        <Form.Item required name="name" label={t('服务名称')}>
          <Input placeholder={t('请输入服务名称')}/>
        </Form.Item>
        <Form.Item name="type" initialValue={store.mcpRecord.type || 'docker'} label={t('部署类型')}
                   tooltip={t('Docker：在本服务器上以容器方式运行；HTTP：连接远端 Streamable HTTP 服务')}>
          <Radio.Group onChange={e => setType(e.target.value)}>
            <Radio.Button value="docker">Docker</Radio.Button>
            <Radio.Button value="http">HTTP</Radio.Button>
          </Radio.Group>
        </Form.Item>
        {type === 'docker' ? (
          <React.Fragment>
            <Form.Item required name="image" label={t('Docker镜像')}
                       extra={t('例如：mcp/fetch，建议提前在服务器上 docker pull 好镜像')}>
              <Input placeholder={t('请输入镜像名称')}/>
            </Form.Item>
            <Form.Item name="command" label={t('附加参数')} tooltip={t('容器启动命令的附加参数，一般留空')}>
              <Input placeholder={t('选填')}/>
            </Form.Item>
            <Form.Item name="env" label={t('环境变量')} tooltip={t('JSON 对象，将以 -e 传入容器')}>
              <Input.TextArea rows={3} placeholder={'{"API_KEY": "xxx"}'}/>
            </Form.Item>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <Form.Item required name="url" label={t('服务地址')}
                       extra={t('Streamable HTTP 端点，例如：https://example.com/mcp')}>
              <Input placeholder="https://example.com/mcp"/>
            </Form.Item>
            <Form.Item name="headers" label={t('请求头')} tooltip={t('JSON 对象，可用于携带认证信息')}>
              <Input.TextArea rows={3} placeholder={'{"Authorization": "Bearer xxx"}'}/>
            </Form.Item>
          </React.Fragment>
        )}
        <Form.Item name="timeout" initialValue={store.mcpRecord.timeout || 60} label={t('调用超时')}>
          <InputNumber min={5} max={600} style={{width: 160}} addonAfter={t('秒')}/>
        </Form.Item>
        <Form.Item name="is_active" valuePropName="checked"
                   initialValue={store.mcpRecord.is_active === undefined ? true : store.mcpRecord.is_active}
                   label={t('启用')} extra={t('保存后请执行连接测试以获取工具清单，智能体只会使用已缓存的工具。')}>
          <Switch/>
        </Form.Item>
        <Form.Item name="desc" label={t('备注信息')}>
          <Input.TextArea placeholder={t('请输入备注信息')}/>
        </Form.Item>
      </Form>
    </Modal>
  )
})
