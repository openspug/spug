/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { Form, Radio, Button, Tooltip } from 'antd';
import { ACEditor } from 'components';
import { cleanCommand } from 'libs';
import 'ace-builds/src-noconflict/mode-text';
import 'ace-builds/src-noconflict/mode-sh';
import 'ace-builds/src-noconflict/theme-tomorrow';
import Tips from './Tips';
import store from './store';

export default observer(function () {
  function handleNext() {
    store.page += 1
  }

  const FilterHead = (
    <div style={{width: 512, display: 'flex', justifyContent: 'space-between'}}>
      <span>
        文件过滤规则 &nbsp;
        <Tooltip title="请输入相对于项目根目录的文件路径，根据包含或排除规则进行打包。">
          <QuestionCircleOutlined style={{color: 'rgba(0, 0, 0, 0.45)'}}/>
        </Tooltip>
      </span>
      <Radio.Group
        size="small"
        value={store.deploy.filter_rule.type}
        onChange={e => store.deploy.filter_rule.type = e.target.value}>
        <Radio.Button value="contain">
          <Tooltip title="仅打包匹配到的文件或目录，如果内容为空则打包所有。">包含</Tooltip>
        </Radio.Button>
        <Radio.Button value="exclude">
          <Tooltip title="打包时排除匹配到的文件或目录，如果内容为空则不排除任何文件。">排除</Tooltip>
        </Radio.Button>
      </Radio.Group>
    </div>
  )

  const info = store.deploy;
  return (
    <Form layout="vertical" style={{padding: '0 120px'}}>
      <Form.Item label={FilterHead} tooltip="xxx">
        <ACEditor
          readOnly={store.isReadOnly}
          mode="text"
          width="100%"
          height="80px"
          placeholder="每行一条规则"
          value={info['filter_rule']['data']}
          onChange={v => info['filter_rule']['data'] = cleanCommand(v)}
          style={{border: '1px solid #e8e8e8'}}/>
      </Form.Item>
      <Form.Item
        label="代码检出前执行"
        tooltip="在运行 Spug 的服务器(或容器)上执行，当前目录为仓库源代码目录，可以执行任意自定义命令。"
        extra={<span>{Tips}，请避免在此修改已跟踪的文件，防止在检出代码时失败。</span>}>
        <ACEditor
          readOnly={store.isReadOnly}
          mode="sh"
          theme="tomorrow"
          width="100%"
          height="120px"
          placeholder="输入要执行的命令"
          value={info['hook_pre_server']}
          onChange={v => info['hook_pre_server'] = cleanCommand(v)}
          style={{border: '1px solid #e8e8e8'}}/>
      </Form.Item>
      <Form.Item
        label="代码检出后执行"
        style={{marginTop: 12, marginBottom: 24}}
        tooltip="在运行 Spug 的服务器(或容器)上执行，当前目录为检出后的源代码目录，可执行任意自定义命令。"
        extra={<span>{Tips}，大多数情况下在此进行构建操作。</span>}>
        <ACEditor
          readOnly={store.isReadOnly}
          mode="sh"
          theme="tomorrow"
          width="100%"
          height="120px"
          placeholder="输入要执行的命令"
          value={info['hook_post_server']}
          onChange={v => info['hook_post_server'] = cleanCommand(v)}
          style={{border: '1px solid #e8e8e8'}}/>
      </Form.Item>
      <Form.Item wrapperCol={{span: 14, offset: 6}}>
        <Button type="primary" onClick={handleNext}>下一步</Button>
        <Button style={{marginLeft: 20}} onClick={() => store.page -= 1}>上一步</Button>
      </Form.Item>
    </Form>
  )
})
