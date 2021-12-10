/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { PlusOutlined, ThunderboltOutlined, BulbOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Form, Button, Alert, Radio, Tooltip } from 'antd';
import { ACEditor, AuthDiv, Breadcrumb } from 'components';
import Selector from 'pages/host/Selector';
import TemplateSelector from './TemplateSelector';
import Output from './Output';
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

  useEffect(() => {
    return () => {
      store.host_ids = []
      if (store.showConsole) {
        store.switchConsole()
      }
    }
  }, [])

  function handleSubmit() {
    setLoading(true)
    const host_ids = store.host_ids;
    http.post('/api/exec/do/', {host_ids, interpreter, command: cleanCommand(command)})
      .then(store.switchConsole)
      .finally(() => setLoading(false))
  }

  function handleTemplate(host_ids, command, interpreter) {
    if (host_ids.length > 0) store.host_ids = host_ids
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
      <div className={style.index} hidden={store.showConsole}>
        <Form layout="vertical" className={style.left}>
          <Form.Item required label="目标主机">
            {store.host_ids.length > 0 ? (
              <Alert
                type="info"
                className={style.area}
                message={<div>已选择 <b style={{fontSize: 18, color: '#1890ff'}}>{store.host_ids.length}</b> 台主机</div>}
                onClick={() => store.showHost = true}/>
            ) : (
              <Button icon={<PlusOutlined/>} onClick={() => store.showHost = true}>
                添加目标主机
              </Button>
            )}
          </Form.Item>

          <Form.Item required label="执行命令" style={{position: 'relative'}}>
            <Radio.Group
              buttonStyle="solid"
              style={{marginBottom: 12}}
              value={interpreter}
              onChange={e => setInterpreter(e.target.value)}>
              <Radio.Button value="sh" style={{width: 80, textAlign: 'center'}}>Shell</Radio.Button>
              <Radio.Button value="python" style={{width: 80, textAlign: 'center'}}>Python</Radio.Button>
            </Radio.Group>
            <a href="https://spug.cc/docs/batch-exec" target="_blank" rel="noopener noreferrer"
               className={style.tips}><BulbOutlined/> 使用全局变量？</a>
            <Button style={{float: 'right'}} icon={<PlusOutlined/>} onClick={store.switchTemplate}>从执行模版中选择</Button>
            <ACEditor className={style.editor} mode={interpreter} value={command} width="100%" onChange={setCommand}/>
          </Form.Item>
          <Button loading={loading} icon={<ThunderboltOutlined/>} type="primary" onClick={handleSubmit}>开始执行</Button>
        </Form>

        <div className={style.right}>
          <div className={style.title}>
            执行记录
            <Tooltip title="多次相同的执行记录将会合并展示，每天自动清理，保留最近50条记录。">
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
      </div>
      {store.showTemplate &&
      <TemplateSelector onCancel={store.switchTemplate} onOk={handleTemplate}/>}
      {store.showConsole && <Output onBack={store.switchConsole}/>}
      <Selector
        visible={store.showHost}
        selectedRowKeys={[...store.host_ids]}
        onCancel={() => store.showHost = false}
        onOk={(_, ids) => store.host_ids = ids}/>
    </AuthDiv>
  )
}

export default observer(TaskIndex)
