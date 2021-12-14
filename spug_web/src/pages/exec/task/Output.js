/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react';
import { PageHeader } from 'antd';
import {
  LoadingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CodeOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { FitAddon } from 'xterm-addon-fit';
import { Terminal } from 'xterm';
import style from './index.module.less';
import { X_TOKEN } from 'libs';
import store from './store';

let gCurrent;

function OutView(props) {
  const el = useRef()
  const [term, setTerm] = useState(new Terminal())
  const [current, setCurrent] = useState(Object.keys(store.outputs)[0])

  useEffect(() => {
    store.tag = ''
    gCurrent = current
    const fitPlugin = new FitAddon()
    term.setOption('disableStdin', false)
    term.setOption('fontFamily', 'Source Code Pro, Courier New, Courier, Monaco, monospace, PingFang SC, Microsoft YaHei')
    term.setOption('theme', {background: '#f0f0f0', foreground: '#000', selection: '#999', cursor: '#f0f0f0'})
    term.loadAddon(fitPlugin)
    term.open(el.current)
    fitPlugin.fit()
    term.write('\x1b[36m### WebSocket connecting ...\x1b[0m')
    const resize = () => fitPlugin.fit();
    window.addEventListener('resize', resize)
    setTerm(term)

    return () => window.removeEventListener('resize', resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/api/ws/exec/${store.token}/?x-token=${X_TOKEN}`);
    socket.onopen = () => {
      const message = '\r\x1b[K\x1b[36m### Waiting for scheduling ...\x1b[0m'
      for (let key of Object.keys(store.outputs)) {
        store.outputs[key].data = message
      }
      term.write(message)
      socket.send('ok');
    }
    socket.onmessage = e => {
      if (e.data === 'pong') {
        socket.send('ping')
      } else {
        _handleData(e.data)
      }
    }
    socket.onclose = () => {
      for (let key of Object.keys(store.outputs)) {
        if (store.outputs[key].status === -2) {
          store.outputs[key].status = -1
        }
        store.outputs[key].data += '\r\n\x1b[31mWebsocket connection failed!\x1b[0m'
        term.write('\r\n\x1b[31mWebsocket connection failed!\x1b[0m')
      }
    }
    return () => socket && socket.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function _handleData(message) {
    const {key, data, status} = JSON.parse(message);
    if (status !== undefined) {
      store.outputs[key].status = status;
    }
    if (data) {
      store.outputs[key].data += data
      if (String(key) === gCurrent) term.write(data)
    }
  }

  function handleSwitch(key) {
    setCurrent(key)
    gCurrent = key
    term.clear()
    term.write(store.outputs[key].data)
  }

  function openTerminal(key) {
    window.open(`/ssh?id=${key}`)
  }

  const {tag, items, counter} = store
  return (
    <div className={style.output}>
      <div className={style.side}>
        <PageHeader onBack={props.onBack} title="执行详情"/>
        <div className={style.tags}>
          <div
            className={`${style.item} ${tag === '0' ? style.pendingOn : style.pending}`}
            onClick={() => store.updateTag('0')}>
            <ClockCircleOutlined/>
            <div>{counter['0']}</div>
          </div>
          <div
            className={`${style.item} ${tag === '1' ? style.successOn : style.success}`}
            onClick={() => store.updateTag('1')}>
            <CheckCircleOutlined/>
            <div>{counter['1']}</div>
          </div>
          <div
            className={`${style.item} ${tag === '2' ? style.failOn : style.fail}`}
            onClick={() => store.updateTag('2')}>
            <ExclamationCircleOutlined/>
            <div>{counter['2']}</div>
          </div>
        </div>

        <div className={style.list}>
          {items.map(([key, item]) => (
            <div key={key} className={[style.item, key === current ? style.active : ''].join(' ')}
                 onClick={() => handleSwitch(key)}>
              {item.status === -2 ? (
                <LoadingOutlined style={{color: '#1890ff'}}/>
              ) : item.status === 0 ? (
                <CheckCircleOutlined style={{color: '#52c41a'}}/>
              ) : (
                <ExclamationCircleOutlined style={{color: 'red'}}/>
              )}
              <div className={style.text}>{item.title}</div>
            </div>
          ))}
        </div>
      </div>
      <div className={style.body}>
        <div className={style.header}>
          <div className={style.title}>{store.outputs[current].title}</div>
          <CodeOutlined className={style.icon} onClick={() => openTerminal(current)}/>
        </div>
        <div className={style.term}>
          <div ref={el} style={{width: '100%'}}/>
        </div>
      </div>
    </div>
  )
}

export default observer(OutView)