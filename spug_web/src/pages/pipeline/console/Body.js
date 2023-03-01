/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react';
import { Tooltip, Tabs } from 'antd';
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
  const [wsState, setWSState] = useState();

  useEffect(() => {
    let socket;
    http.post('/api/pipeline/do/', {id: 1})
      .then(res => {
        socket = _makeSocket(res.token)
        S.nodes = res.nodes
        S.node = res.nodes[0]
      })
    return () => socket && socket.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    term.write('\x1b[36m### WebSocket connecting ...\x1b[0m')
    window.addEventListener('resize', resize)

    return () => window.removeEventListener('resize', resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  function _makeSocket(token, index = 0) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/api/ws/pipeline/${token}/?x-token=${X_TOKEN}`);
    socket.onopen = () => socket.send(String(index));
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
    socket.onerror = () => {
      setWSState('Websocket connection failed')
    }
    return socket
  }

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

  function handleTerminate() {

  }

  function openTerminal() {

  }

  return (
    <div className={css.container}>
      <div className={css.header}>
        <div className={css.title}>{S.node?.name}</div>
        <div className={css.tips}>{wsState}</div>
        <Tooltip title="终止执行">
          {S.outputs[S.nodeID]?.status === 'processing' ? (
            <StopOutlined className={css.icon} style={{color: '#faad14'}} onClick={handleTerminate}/>
          ) : (
            <StopOutlined className={css.icon} style={{color: '#dfdfdf'}}/>
          )}
        </Tooltip>
        <Tooltip title="打开web终端">
          <CodeOutlined className={css.icon} onClick={() => openTerminal()}/>
        </Tooltip>
      </div>
      {S.node?.module === 'ssh_exec' && (
        <Tabs items={(S.node?.targets ?? []).map(x => ({label: x.name, key: `${S.node.id}.${x.id}`}))}
              tabBarStyle={{fontSize: 13}} onChange={v => S.node = Object.assign({}, S.node, {_id: v})}/>
      )}
      <div className={css.termContainer}>
        <div ref={el} className={css.term}/>
      </div>
    </div>
  )
}

export default observer(Body)