/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useEffect, useMemo } from 'react';
import { Form, Input, Radio, Switch, Alert, message } from 'antd';
import { t } from 'libs';

// 三个群机器人模块的配置项高度一致，差异只在「是否支持加签」「Webhook 样例」
// 和 @所有人 的实现方式上，所以共用一个组件，由 module 决定差异。
const MODULES = {
  push_dd: {
    label: () => t('钉钉'),
    placeholder: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
    secret: true,
    secretTip: () => t('钉钉机器人安全设置选择「加签」时填写，未开启加签可留空。'),
    atTip: () => t('开启后会 @所有人，同时正文末尾会自动追加「@所有人」字样以便钉钉高亮显示。'),
    doc: 'https://spug.cc/docs/use-problem#use-dd',
  },
  push_fs: {
    label: () => t('飞书'),
    placeholder: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx',
    secret: true,
    secretTip: () => t('飞书机器人安全设置选择「签名校验」时填写，未开启可留空。'),
    atTip: () => t('开启后会在卡片内容中 @所有人。'),
    doc: 'https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot',
  },
  push_wx: {
    label: () => t('企业微信'),
    placeholder: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx',
    secret: false,
    atTip: () => t('企业微信的 markdown 消息不支持 @，开启后会在推送内容之后额外发送一条提醒消息。'),
    doc: 'https://developer.work.weixin.qq.com/document/path/91770',
  },
};

// 每行一条，用单个换行即可。钉钉的 markdown 把单换行当软换行，由后端在发送前
// 补成硬换行，不要在这里写 \n\n——那会让编辑框和飞书/企业微信的消息里都多出空行。
// 写成函数而不是模块级常量：模块加载期调用 t() 会踩到 libs 桶的循环依赖陷阱。
function defaultBody() {
  return [
    t('**流水线：** $SPUG_PIPE_NAME'),
    t('**状态：** $SPUG_STATE_TEXT'),
    t('**时间：** $SPUG_DATETIME'),
  ].join('\n')
}

function PushWebhook(props) {
  const [form] = Form.useForm()
  const conf = MODULES[props.node.module] || MODULES.push_dd

  const initialValues = useMemo(() => ({
    condition: 'always',
    title: t('流水线执行通知'),
    body: defaultBody(),
    ...props.node,
  }), [props.node])

  useEffect(() => {
    props.setHandler(() => handleSave)
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
    if (!data.url) return message.error(t('请输入Webhook地址'))
    if (!/^https?:\/\//.test(data.url)) return message.error(t('Webhook地址需以 http:// 或 https:// 开头'))
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
      <Form.Item
        required
        name="url"
        label={t('{} 机器人 Webhook 地址', conf.label())}
        extra={
          <a target="_blank" rel="noopener noreferrer" href={conf.doc}>{t('如何获取机器人地址？')}</a>
        }>
        <Input placeholder={conf.placeholder}/>
      </Form.Item>
      {conf.secret ? (
        <Form.Item name="secret" label={t('加签密钥')} tooltip={conf.secretTip()}>
          <Input.Password placeholder={t('未开启加签可留空')}/>
        </Form.Item>
      ) : null}
      <Form.Item required name="title" label={t('推送标题')}>
        <Input placeholder={t('请输入推送标题')}/>
      </Form.Item>
      <Form.Item
        required
        name="body"
        label={t('推送内容')}
        extra={t('支持 markdown 语法，可使用 $SPUG_PIPE_NAME（流程名）、$SPUG_NODE_NAME（节点名）、$SPUG_STATE_TEXT（上游状态）、$SPUG_DATETIME（当前时间）以及参数化节点定义的变量。')}>
        <Input.TextArea autoSize={{minRows: 5, maxRows: 12}} placeholder={t('请输入推送内容')}/>
      </Form.Item>
      <Form.Item name="at_all" valuePropName="checked" label={t('@所有人')} tooltip={conf.atTip()}>
        <Switch checkedChildren={t('是')} unCheckedChildren={t('否')}/>
      </Form.Item>
      <Alert
        showIcon
        type="info"
        message={t('推送节点通常建议将执行条件设置为「总是执行」或「上游执行失败时」，以便在流程失败时也能收到通知。')}/>
    </Form>
  )
}

export default PushWebhook
