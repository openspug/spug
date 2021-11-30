/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { PlusOutlined, ThunderboltOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Form, Button, Card, Alert, Radio, Tooltip } from 'antd';
import { ACEditor, AuthDiv, Breadcrumb } from 'components';
import Selector from 'pages/host/Selector';
import TemplateSelector from './TemplateSelector';
import ExecConsole from './ExecConsole';
import { http, cleanCommand } from 'libs';
import moment from 'moment';
import store from './store';
import style from './index.module.less';

function TaskIndex() {
  const [loading, setLoading] = useState(false)
  const [interpreter, setInterpreter] = useState('sh')
  const [command, setCommand] = useState('')
  const [histories, setHistories] = useState([])

  useEffect(() => {
    if (!loading) {
      http.get('/api/exec/history/')
        .then(res => setHistories(res))
    }
  }, [loading])

  function handleSubmit() {
    setLoading(true)
    const host_ids = store.host_ids;
    http.post('/api/exec/do/', {host_ids, interpreter, command: cleanCommand(command)})
      .then(store.switchConsole)
      .finally(() => setLoading(false))
  }

  function handleTemplate(command, interpreter) {
    setInterpreter(interpreter)
    setCommand(command)
  }

  function handleClick(item) {
    setInterpreter(item.interpreter)
    setCommand(item.command)
    store.host_ids = item.host_ids
  }

  return (
    <AuthDiv auth="exec.task.do">
      <Breadcrumb>
        <Breadcrumb.Item>首页</Breadcrumb.Item>
        <Breadcrumb.Item>批量执行</Breadcrumb.Item>
        <Breadcrumb.Item>执行任务</Breadcrumb.Item>
      </Breadcrumb>
      <Card bodyStyle={{display: 'flex', padding: 0}}>
        <Form layout="vertical" style={{padding: 24, width: '60%'}}>
          <Form.Item required label="目标主机">
            {store.host_ids.length > 0 && (
              <Alert style={{width: 200}} type="info" message={`已选择 ${store.host_ids.length} 台主机`}/>
            )}
          </Form.Item>
          <Button
            style={{marginBottom: 24}}
            icon={<PlusOutlined/>}
            onClick={() => store.showHost = true}>从主机列表中选择</Button>
          <Form.Item required label="执行命令">
            <Radio.Group
              buttonStyle="solid"
              style={{marginBottom: 12}}
              value={interpreter}
              onChange={e => setInterpreter(e.target.value)}>
              <Radio.Button value="sh">Shell</Radio.Button>
              <Radio.Button value="python">Python</Radio.Button>
            </Radio.Group>
            <ACEditor mode={interpreter} value={command} height="350px" width="100%" onChange={setCommand}/>
          </Form.Item>
          <Form.Item>
            <Button icon={<PlusOutlined/>} onClick={store.switchTemplate}>从执行模版中选择</Button>
          </Form.Item>
          <Button loading={loading} icon={<ThunderboltOutlined/>} type="primary" onClick={handleSubmit}>开始执行</Button>
        </Form>
        <div className={style.hisBlock}>
          <div className={style.title}>
            执行记录
            <Tooltip title="每天自动清理，保留最近50条记录。">
              <QuestionCircleOutlined style={{color: '#999', marginLeft: 8}}/>
            </Tooltip>
          </div>
          <div className={style.inner}>
            {histories.map((item, index) => (
              <div key={index} className={style.item} onClick={() => handleClick(item)}>
                <div className={style[item.interpreter]}>{item.interpreter.substr(0, 2)}</div>
                <div className={style.number}>{item.host_ids.length}</div>
                <div className={style.command}>{item.command}</div>
                <div className={style.desc}>{moment(item.updated_at).format('MM.DD HH:mm')}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>
      {store.showTemplate &&
      <TemplateSelector onCancel={store.switchTemplate} onOk={handleTemplate}/>}
      {store.showConsole && <ExecConsole onCancel={store.switchConsole}/>}
      <Selector
        visible={store.showHost}
        selectedRowKeys={[...store.host_ids]}
        onCancel={() => store.showHost = false}
        onOk={(_, ids) => store.host_ids = ids}/>
    </AuthDiv>
  )
}

export default observer(TaskIndex)
