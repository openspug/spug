/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react';
import {
  FullscreenOutlined,
  FullscreenExitOutlined,
  LoadingOutlined,
  StopOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { FitAddon } from 'xterm-addon-fit';
import { Terminal } from 'xterm';
import { Modal, Spin, Tooltip } from 'antd';
import { X_TOKEN, http } from 'libs';
import styles from './index.module.less';
import gStore from 'gStore';
import store from './store';
import lds from 'lodash';

export default observer(function Console() {
  const el = useRef()
  const [term] = useState(new Terminal({disableStdin: true}))
  const [token, setToken] = useState();
  const [status, setStatus] = useState();
  const [fullscreen, setFullscreen] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let socket;
    http.get(`/api/repository/${store.record.id}/`)
      .then(res => {
        setToken(res.token)
        setStatus(res.output.status)
        term.write(res.output.data)
        if (res.status === '1') {
          socket = _makeSocket(res.index)
        }
      })
      .finally(() => setFetching(false))
    return () => socket && socket.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const fitPlugin = new FitAddon()
    term.loadAddon(fitPlugin)
    term.setOption('fontSize', 14)
    term.setOption('lineHeight', 1.2)
    term.setOption('fontFamily', gStore.terminal.fontFamily)
    term.setOption('theme', {background: '#2b2b2b', foreground: '#A9B7C6', cursor: '#2b2b2b'})
    term.attachCustomKeyEventHandler((arg) => {
      if (arg.ctrlKey && arg.code === 'KeyC' && arg.type === 'keydown') {
        document.execCommand('copy')
        return false
      }
      return true
    })
    term.open(el.current)
    term.fit = () => fitPlugin.fit()
    fitPlugin.fit()
    const resize = () => fitPlugin.fit();
    window.addEventListener('resize', resize)

    return () => window.removeEventListener('resize', resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function _makeSocket(index = 0) {
    const token = store.record.id;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/api/ws/build/${token}/?x-token=${X_TOKEN}`);
    socket.onopen = () => socket.send(String(index));
    socket.onmessage = e => {
      if (e.data === 'pong') {
        socket.send(String(index))
      } else {
        index += 1;
        const {data, status} = JSON.parse(e.data);
        if (!lds.isNil(data)) term.write(data);
        if (!lds.isNil(status)) setStatus(status);
      }
    }
    socket.onerror = () => {
      term.write('\r\n\x1b[31mWebsocket connection failed!\x1b[0m')
    }
    return socket
  }

  useEffect(() => {
    term.fit && term.fit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen])

  function handleClose() {
    store.fetchRecords();
    store.logVisible = false
  }

  function handleTerminate() {
    setLoading(true)
    http.post('/api/exec/terminate/', {token, target: 'local'})
      .finally(() => setLoading(false))
  }

  return (
    <Modal
      visible
      width={fullscreen ? '100%' : 1000}
      title={[
        <span key="1">构建控制台</span>,
        <div key="2" className={styles.fullscreen} onClick={() => setFullscreen(!fullscreen)}>
          {fullscreen ? <FullscreenExitOutlined/> : <FullscreenOutlined/>}
        </div>
      ]}
      footer={null}
      onCancel={handleClose}
      className={styles.console}
      maskClosable={false}>
      <Spin spinning={fetching}>
        <div className={styles.header}>
          <div className={styles.title}>{store.record.version}</div>
          {status === 'error' ? (
            <ExclamationCircleOutlined style={{color: 'red'}}/>
          ) : status === 'success' ? (
            <CheckCircleOutlined style={{color: '#52c41a'}}/>
          ) : (
            <LoadingOutlined style={{color: '#1890ff'}}/>
          )}
          <div style={{flex: 1}}/>
          {loading ? (
            <LoadingOutlined className={styles.icon} style={{color: '#faad14'}}/>
          ) : (
            <Tooltip title="终止构建">
              {status === 'doing' ? (
                <StopOutlined style={{color: '#faad14'}} onClick={handleTerminate}/>
              ) : (
                <StopOutlined style={{color: '#dfdfdf'}}/>
              )}
            </Tooltip>
          )}
        </div>
        <div className={styles.out}>
          <div ref={el} className={styles.term}/>
        </div>
      </Spin>
    </Modal>
  )
})
