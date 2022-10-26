/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useEffect, useRef, useState } from 'react';
import { observer, useLocalStore } from 'mobx-react';
import { Tooltip, Modal, Spin, Card } from 'antd';
import {
  LoadingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CodeOutlined,
  StopOutlined,
  ShrinkOutlined,
  ClockCircleOutlined, CloseOutlined,
} from '@ant-design/icons';
import { FitAddon } from 'xterm-addon-fit';
import { Terminal } from 'xterm';
import styles from './console.module.less';
import { clsNames, http, X_TOKEN } from 'libs';
import store from './store';
import gStore from 'gStore';
import lds from 'lodash';

let gCurrent;

function Console(props) {
  const el = useRef()
  const outputs = useLocalStore(() => ({}));
  const [term] = useState(new Terminal());
  const [fitPlugin] = useState(new FitAddon());
  const [token, setToken] = useState();
  const [current, setCurrent] = useState();
  const [sides, setSides] = useState([]);
  const [miniMode, setMiniMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(props.request.mode === 'read' ? readDeploy : doDeploy, [])

  useEffect(() => {
    gCurrent = current
    term.setOption('disableStdin', true)
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
    term.loadAddon(fitPlugin)
    term.open(el.current)
    fitPlugin.fit()
    // term.write('\x1b[36m### WebSocket connecting ...\x1b[0m')
    const resize = () => fitPlugin.fit();
    window.addEventListener('resize', resize)

    return () => window.removeEventListener('resize', resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function readDeploy() {
    let socket;
    http.get(`/api/deploy/request/${props.request.id}/`)
      .then(res => {
        _handleResponse(res)
        if (res.status === '2') {
          socket = _makeSocket(res.index)
        }
      })
    return () => socket && socket.close()
  }

  function doDeploy() {
    let socket;
    const formData = {mode: props.request.mode}
    if (Array.isArray(props.request.mode)) {
      formData.mode = 'gray'
      formData.host_ids = props.request.mode
    }
    http.post(`/api/deploy/request/${props.request.id}/`, formData)
      .then(res => {
        _handleResponse(res)
        socket = _makeSocket()
        store.fetchInfo(props.request.id)
      })
    return () => socket && socket.close()
  }

  function _handleResponse(res) {
    Object.assign(outputs, res.outputs)
    let tmp = Object.values(res.outputs).map(x => lds.pick(x, ['id', 'title']))
    tmp = lds.reverse(lds.sortBy(tmp, [x => String(x.id)]))
    setToken(res.token)
    setSides(tmp)
    setTimeout(() => {
      setFetching(false)
      handleSwitch(tmp[0]?.id)
    }, 100)
  }

  function _makeSocket(index = 0) {
    const token = props.request.id;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/api/ws/request/${token}/?x-token=${X_TOKEN}`);
    socket.onopen = () => socket.send(String(index));
    socket.onmessage = e => {
      if (e.data === 'pong') {
        socket.send(String(index))
      } else {
        index += 1;
        const {key, data, status} = JSON.parse(e.data);
        if (!outputs[key]) return
        if (!lds.isNil(data)) {
          outputs[key].data += data
          if (key === gCurrent) term.write(data)
        }
        if (!lds.isNil(status)) outputs[key].status = status;
      }
    }
    socket.onerror = () => {
      const data = '\r\n\x1b[31mWebsocket connection failed!\x1b[0m'
      for (let key of Object.keys(outputs)) {
        if (key === gCurrent) term.write(data)
        outputs[key].data += data
      }
    }
    return socket
  }

  function handleSwitch(key) {
    if (key === current) return
    setCurrent(key)
    gCurrent = key
    term.reset()
    term.write(outputs[key].data)
  }

  function handleTerminate() {
    setLoading(true)
    http.post('/api/exec/terminate/', {token, target: current})
      .finally(() => setLoading(false))
  }

  function openTerminal() {
    window.open(`/ssh?id=${current}`)
  }

  const cItem = outputs[current] || {}
  const localTitle = props.request.app_extend === '2' ? '本地动作' : '构建'
  return (
    <React.Fragment>
      {miniMode && (
        <Card
          className={styles.miniCard}
          bodyStyle={{padding: 0}}
          onClick={() => setMiniMode(false)}>
          <div className={styles.header}>
            <div className={styles.title}>{props.request.name}</div>
            <CloseOutlined onClick={() => store.showConsole(props.request, true)}/>
          </div>
          <div className={styles.list}>
            {sides.map(item => (
              <div key={item.id} className={clsNames(styles.item, item.id === current && styles.active)}
                   onClick={() => handleSwitch(item.id)}>
                {outputs[item.id]?.status === 'error' ? (
                  <ExclamationCircleOutlined style={{color: 'red'}}/>
                ) : outputs[item.id]?.status === 'success' ? (
                  <CheckCircleOutlined style={{color: '#52c41a'}}/>
                ) : outputs[item.id]?.status === 'doing' ? (
                  <LoadingOutlined style={{color: '#1890ff'}}/>
                ) : (
                  <ClockCircleOutlined style={{color: '#faad14'}}/>
                )}
                {item.id === 'local' ? (
                  <div className={styles.text} style={{color: '#0E989A'}}>{localTitle}</div>
                ) : (
                  <div className={styles.text}>{item.title}</div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal
        visible={!miniMode}
        width="80%"
        footer={null}
        maskClosable={false}
        className={styles.container}
        bodyStyle={{padding: 0}}
        onCancel={() => store.showConsole(props.request, true)}
        title={[
          <span key="1">{props.request.name}</span>,
          <div key="2" className={styles.miniIcon} onClick={() => setMiniMode(true)}>
            <ShrinkOutlined/>
          </div>
        ]}>
        <Spin spinning={fetching}>
          <div className={styles.output}>
            <div className={styles.side}>
              <div className={styles.title}>任务列表</div>
              <div className={styles.list}>
                {sides.map(item => (
                  <div key={item.id} className={clsNames(styles.item, item.id === current && styles.active)}
                       onClick={() => handleSwitch(item.id)}>
                    {outputs[item.id]?.status === 'error' ? (
                      <ExclamationCircleOutlined style={{color: 'red'}}/>
                    ) : outputs[item.id]?.status === 'success' ? (
                      <CheckCircleOutlined style={{color: '#52c41a'}}/>
                    ) : outputs[item.id]?.status === 'doing' ? (
                      <LoadingOutlined style={{color: '#1890ff'}}/>
                    ) : (
                      <ClockCircleOutlined style={{color: '#faad14'}}/>
                    )}
                    {item.id === 'local' ? (
                      <div className={styles.text} style={{color: '#0E989A'}}>{localTitle}</div>
                    ) : (
                      <div className={styles.text}>{item.title}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.body}>
              <div className={styles.header}>
                <div className={styles.title}>{cItem.id === 'local' ? localTitle : cItem.title}</div>
                {loading ? (
                  <LoadingOutlined className={styles.icon} style={{color: '#faad14'}}/>
                ) : (
                  <Tooltip title="终止发布">
                    {cItem.status === 'doing' ? (
                      <StopOutlined className={styles.icon} style={{color: '#faad14'}} onClick={handleTerminate}/>
                    ) : (
                      <StopOutlined className={styles.icon} style={{color: '#dfdfdf'}}/>
                    )}
                  </Tooltip>
                )}
                {cItem.id !== 'local' && (
                  <Tooltip title="打开web终端">
                    <CodeOutlined className={styles.icon} onClick={() => openTerminal(current)}/>
                  </Tooltip>
                )}
              </div>
              <div className={styles.termContainer}>
                <div ref={el} className={styles.term}/>
              </div>
            </div>
          </div>
        </Spin>
      </Modal>
    </React.Fragment>
  )
}

export default observer(Console)