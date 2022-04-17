/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useEffect, useState } from 'react';
import { Modal, Form, Radio, Input, message } from 'antd';
import { http } from 'libs';

function Repo(props) {
  const [form] = Form.useForm()
  const [key, setKey] = useState()

  useEffect(() => {
    http.post('/api/app/kit/key/', {key: 'public_key'})
      .then(res => setKey(res))
    if (props.url) {
      const fields = props.url.match(/^(https?:\/\/)(.+):(.+)@(.*)$/)
      if (fields && fields.length === 5) {
        form.setFieldsValue({
          type: 'password',
          url: fields[1] + fields[4],
          username: decodeURIComponent(fields[2]),
          password: decodeURIComponent(fields[3])
        })
      } else if (props.url.startsWith('git@')) {
        form.setFieldsValue({type: 'key', url: props.url})
      } else {
        form.setFieldsValue({url: props.url})
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSubmit() {
    const formData = form.getFieldsValue()
    if (!formData.url) return message.error('请输入仓库地址')
    let url = formData.url;
    if (formData.type === 'password') {
      if (!formData.username) return message.error('请输入账户')
      if (!formData.password) return message.error('请输入密码')
      if (formData.url.startsWith('http')) {
        const username = encodeURIComponent(formData.username)
        const password = encodeURIComponent(formData.password)
        url = formData.url.replace(/^(https?:\/\/)/, `$1${username}:${password}@`)
      } else {
        return message.error('认证类型为账户密码，仓库地址需以http或https开头。')
      }
    } else if (formData.url.startsWith('http')) {
      return message.error('输入的仓库地址以http或https开头，则认证类型需为账户密码认证。')
    }
    props.onOk(url)
    props.onCancel()
  }

  function copyToClipBoard() {
    const t = document.createElement('input');
    t.value = key;
    document.body.appendChild(t);
    t.select();
    document.execCommand('copy');
    t.remove();
    message.success('已复制')
  }

  return (
    <Modal
      visible
      maskClosable={false}
      title="设置Git仓库"
      onCancel={props.onCancel}
      onOk={handleSubmit}>
      <Form form={form} labelCol={{span: 6}} wrapperCol={{span: 16}}>
        <Form.Item label="认证类型" name="type" initialValue="password">
          <Radio.Group>
            <Radio.Button value="password">账户密码</Radio.Button>
            <Radio.Button value="key">密钥</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item required label="仓库地址" name="url">
          <Input placeholder="请输入"/>
        </Form.Item>

        <Form.Item noStyle shouldUpdate>
          {({getFieldValue}) =>
            getFieldValue('type') === 'password' ? (
              <React.Fragment>
                <Form.Item required label="账户" name="username">
                  <Input placeholder="请输入"/>
                </Form.Item>
                <Form.Item required label="密码" name="password">
                  <Input placeholder="请输入"/>
                </Form.Item>
              </React.Fragment>
            ) : (
              <Form.Item label="密钥" extra={(
                <span>
                  请复制该密钥，以Gitee为例可参考
                  <a target="_blank" rel="noopener noreferrer" href="https://gitee.com/help/articles/4191">Gitee文档</a>
                  进行后续配置。
              </span>
              )}>
                <span className="btn" onClick={copyToClipBoard}>点击复制密钥</span>
              </Form.Item>
            )
          }
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default Repo
