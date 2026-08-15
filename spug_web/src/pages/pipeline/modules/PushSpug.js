/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Form, Input, Radio, Select, Alert, Spin, message } from 'antd';
import { http, t } from 'libs';

// 同 PushWebhook：写成函数，避免模块加载期调用 t() 踩到 libs 桶的循环依赖陷阱
function defaultBody() {
  return [
    t('流水线：$SPUG_PIPE_NAME'),
    t('状态：$SPUG_STATE_TEXT'),
    t('时间：$SPUG_DATETIME'),
  ].join('\n')
}

// 推送助手的联系人 ID 带有渠道前缀，据此给出更易辨认的分类标签
const CHANNELS = [
  {prefix: 'wx_mp_', label: () => t('微信公众号')},
  {prefix: 'sms_', label: () => t('短信')},
  {prefix: 'mail_', label: () => t('邮件')},
  {prefix: 'voice_', label: () => t('电话')},
];

function channelOf(id) {
  const hit = CHANNELS.find(x => String(id).startsWith(x.prefix));
  return hit ? hit.label() : null
}

function PushSpug(props) {
  const [form] = Form.useForm()
  const [contacts, setContacts] = useState([])
  const [bound, setBound] = useState(true)
  const [fetching, setFetching] = useState(false)

  const initialValues = useMemo(() => ({
    condition: 'always',
    title: t('流水线执行通知'),
    body: defaultBody(),
    ...props.node,
  }), [props.node])

  useEffect(() => {
    props.setHandler(() => handleSave)
    // 切换节点模块会立刻卸载本组件，请求回来时若仍 setState 会触发
    // "state update on an unmounted component" 警告，这里用标志位挡掉。
    let alive = true
    setFetching(true)
    http.get('/api/setting/push/contacts/')
      .then(res => {
        if (!alive) return
        setBound(!!res?.bound)
        setContacts(Array.isArray(res?.contacts) ? res.contacts : [])
      })
      .finally(() => {
        if (alive) setFetching(false)
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    form.resetFields()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.node])

  function handleSave() {
    const data = form.getFieldsValue()
    if (!data.name) return message.error(t('请输入节点名称'))
    if (!data.condition) return message.error(t('请选择节点的执行条件'))
    if (!data.targets || data.targets.length === 0) return message.error(t('请选择推送对象'))
    if (!data.title) return message.error(t('请输入推送标题'))
    if (!data.body) return message.error(t('请输入推送内容'))
    return data
  }

  return (
    <Form layout="vertical" form={form} initialValues={initialValues}>
      <Form.Item required name="name" label={t('节点名称')}>
        <Input placeholder={t('请输入节点名称')}/>
      </Form.Item>
      <Form.Item
        required
        name="condition"
        label={t('执行条件')}
        tooltip={t('当该节点为流程的起始节点时（无上游节点），该条件将会被忽略。')}>
        <Radio.Group>
          <Radio.Button value="success">{t('上游执行成功时')}</Radio.Button>
          <Radio.Button value="error">{t('上游执行失败时')}</Radio.Button>
          <Radio.Button value="always">{t('总是执行')}</Radio.Button>
        </Radio.Group>
      </Form.Item>
      {!fetching && contacts.length === 0 ? (
        <Alert
          showIcon
          type="warning"
          style={{marginBottom: 24}}
          message={t('未获取到推送对象')}
          description={bound
            ? t('已绑定推送助手账户，但没有取到联系人，请先在推送助手中添加联系人。')
            : t('请先在 系统管理/系统设置/推送服务设置 中绑定推送助手账户，并在推送助手中添加联系人。')}/>
      ) : null}
      <Spin spinning={fetching}>
        <Form.Item required name="targets" label={t('推送对象')} tooltip={t('推送对象来自已绑定的推送助手账户。')}>
          <Select
            mode="multiple"
            optionFilterProp="label"
            placeholder={t('请选择推送对象')}
            options={contacts.map(item => {
              const channel = channelOf(item.id)
              return {
                value: item.id,
                label: channel ? `${item.name}（${channel}）` : item.name,
              }
            })}/>
        </Form.Item>
      </Spin>
      <Form.Item required name="title" label={t('推送标题')}>
        <Input placeholder={t('请输入推送标题')}/>
      </Form.Item>
      <Form.Item
        required
        name="body"
        label={t('推送内容')}
        extra={t('可使用 $SPUG_PIPE_NAME（流程名）、$SPUG_NODE_NAME（节点名）、$SPUG_STATE_TEXT（上游状态）、$SPUG_DATETIME（当前时间）以及参数化节点定义的变量。')}>
        <Input.TextArea autoSize={{minRows: 5, maxRows: 12}} placeholder={t('请输入推送内容')}/>
      </Form.Item>
      <Alert
        showIcon
        type="info"
        message={t('推送节点通常建议将执行条件设置为「总是执行」或「上游执行失败时」，以便在流程失败时也能收到通知。')}/>
    </Form>
  )
}

export default PushSpug
