/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, {useState} from 'react';
import { observer } from 'mobx-react';
import { Form, Button, Input, message } from 'antd';
import Editor from 'react-ace';
import 'ace-builds/src-noconflict/mode-text';
import 'ace-builds/src-noconflict/mode-sh';
import 'ace-builds/src-noconflict/theme-tomorrow';
import { http, cleanCommand } from 'libs';
import store from './store';

export default observer(function () {
  const [loading, setLoading] = useState(false);
  const Tips = (
    <a
      target="_blank"
      rel="noopener noreferrer"
      href="https://spug.dev/docs/deploy-config/#%E5%85%A8%E5%B1%80%E5%8F%98%E9%87%8F">内置全局变量</a>
  )

  function handleSubmit() {
    setLoading(true);
    const info = store.deploy;
    info['app_id'] = store.app_id;
    info['extend'] = '1';
    http.post('/api/app/deploy/', info)
      .then(() => {
        message.success('保存成功');
        store.loadDeploys(store.app_id);
        store.ext1Visible = false
      }, () => setLoading(false))
  }

  const info = store.deploy;
  return (
    <Form layout="vertical" style={{padding: '0 120px'}}>
      <Form.Item required label="部署目标路径" tooltip="应用最终在主机上部署路径，构建的结果将会放置于该路径下。">
        <Input value={info['dst_dir']} onChange={e => info['dst_dir'] = e.target.value} placeholder="请输入部署目标路径" />
      </Form.Item>
      <Form.Item
        label="应用发布前执行"
        tooltip="在发布的目标主机上运行，当前目录为目标主机上待发布的源代码目录，可执行任意自定义命令。"
        help={<span>可使用 {Tips}，此时还未进行文件变更，可进行一些发布前置操作。</span>}>
        <Editor
          readOnly={store.isReadOnly}
          mode="sh"
          theme="tomorrow"
          width="100%"
          height="150px"
          placeholder="输入要执行的命令"
          value={info['hook_pre_host']}
          onChange={v => info['hook_pre_host'] = cleanCommand(v)}
          style={{border: '1px solid #e8e8e8'}}/>
      </Form.Item>
      <Form.Item
        label="应用发布后执行"
        style={{marginTop: 12, marginBottom: 24}}
        tooltip="在发布的目标主机上运行，当前目录为已发布的应用目录，可执行任意自定义命令。"
        help={<span>可使用 {Tips}，可以在发布后进行重启服务等操作。</span>}>
        <Editor
          readOnly={store.isReadOnly}
          mode="sh"
          theme="tomorrow"
          width="100%"
          height="150px"
          placeholder="输入要执行的命令"
          value={info['hook_post_host']}
          onChange={v => info['hook_post_host'] = cleanCommand(v)}
          style={{border: '1px solid #e8e8e8'}}/>
      </Form.Item>
      <Form.Item wrapperCol={{span: 14, offset: 6}}>
        <Button disabled={store.isReadOnly} loading={loading} type="primary" onClick={handleSubmit}>提交</Button>
        <Button style={{marginLeft: 20}} onClick={() => store.page -= 1}>上一步</Button>
      </Form.Item>
    </Form>
  )
})