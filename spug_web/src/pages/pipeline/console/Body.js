/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react';
import { Tooltip, Tabs, Popconfirm, Badge } from 'antd';
import { CodeOutlined, StopOutlined } from '@ant-design/icons';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { http, X_TOKEN } from 'libs';
import css from './body.module.less';
import S from './store';
import gStore from 'gStore';

function Body() {
  const el = useRef()
  const [term] = useState(new Terminal());
  const [fitPlugin] = useState(new FitAddon());
  const [wsState, setWSState] = useState('0');

  useEffect(() => {
    term.options.disableStdin = true
    term.options.fontSize = 14
    term.options.lineHeight = 1.2
    term.options.fontFamily = gStore.terminal.fontFamily
    term.options.theme = {background: '#2b2b2b', foreground: '#A9B7C6', cursor: '#2b2b2b'}
    term.attachCustomKeyEventHandler((arg) => {
      if (arg.ctrlKey && arg.code === 'KeyC' && arg.type === 'keydown') {
        document.execCommand('copy')
        return false
      }
      return true
    })
    const resize = () => fitPlugin.fit();
    term.loadAddon(fitPlugin)
    term.open(el.current)
    fitPlugin.fit()
    window.addEventListener('resize', resize)

    return () => window.removeEventListener('resize', resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  useEffect(() => {
    let index = 0;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/api/ws/pipeline/${S.token}/?x-token=${X_TOKEN}`);
    socket.onopen = () => {
      socket.send(String(index));
      setWSState('1')
    }
    socket.onmessage = e => {
      if (e.data === 'pong') {
        socket.send(String(index))
      } else {
        index += 1;
        const {key, data, status} = JSON.parse(e.data);
        if (S.outputs[key]) {
          if (status) {
            S.outputs[key].status = status
            if (key === S.nodeID) {
              S.node.status = status
            }
          }
          if (data) {
            S.outputs[key].data += data
            if (key === S.nodeID) {
              term.write(data)
            }
          }
        } else {
          S.outputs[key] = {data, status}
          S.node.state = ''
        }
      }
    }
    socket.onerror = () => setWSState('2')
    return () => socket && socket.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (S.node.id) {
      fitPlugin.fit()
      term.reset()
      if (S.outputs[S.nodeID]) {
        term.write(S.outputs[S.nodeID].data)
      } else {
        S.outputs[S.nodeID] = {data: ''}
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [S.node])

  function handleTabChange(v) {
    S.node._host_id = v
    S.node = Object.assign({}, S.node)
  }

  function handleTerminate() {
    let token = `${S.token}.${S.node.id}`
    if (S.node._host_id) token += `.${S.node._host_id}`
    return http.post('/api/exec/terminate/', {token})
  }

  function openTerminal() {
    window.open(`/ssh?id=${S.node._host_id}`)
  }

  return (
    <div className={css.container}>
      <div className={css.header}>
        <div className={css.title}>{S.node?.name}</div>
        {wsState === '0' ? (
          <Badge status="processing" text="Websocket 正在连接中"/>
        ) : wsState === '1' ? (
          <Badge status="success" text="Websocket 已连接"/>
        ) : (
          <Badge status="error" text="Websocket 连接已关闭"/>
        )}

        {['build', 'ssh_exec', 'data_transfer', 'data_upload'].includes(S.node.module) && S.outputs[S.nodeID]?.status === 'processing' ? (
          <Popconfirm title="确定要终止执行？" onConfirm={handleTerminate}>
            <StopOutlined className={css.icon} style={{color: '#faad14'}}/>
          </Popconfirm>
        ) : (
          <StopOutlined className={css.icon} style={{color: '#dfdfdf'}}/>
        )}
        {['build', 'ssh_exec', 'data_transfer', 'data_upload'].includes(S.node.module) ? (
          <Tooltip title="打开web终端">
            <CodeOutlined className={css.icon} onClick={() => openTerminal()}/>
          </Tooltip>
        ) : (
          <CodeOutlined className={css.icon} style={{color: '#dfdfdf'}}/>
        )}
      </div>
      {['ssh_exec', 'data_transfer', 'data_upload'].includes(S.node?.module) && (
        <Tabs items={(S.node?._targets ?? []).map(x => ({label: x.name, key: x.id}))}
              className={css.tabs} activeKey={S.node._host_id} onChange={handleTabChange}/>
      )}
      <div className={css.termContainer}>
        <div ref={el} className={css.term}/>
      </div>
    </div>
  )
}

export default observer(Body)