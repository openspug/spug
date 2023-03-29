/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react';
import { Tabs, Tree, Input, Spin, Dropdown, Menu, Button, Drawer } from 'antd';
import {
  FolderOutlined,
  FolderOpenOutlined,
  CloudServerOutlined,
  SearchOutlined,
  SyncOutlined,
  CopyOutlined,
  ReloadOutlined,
  VerticalAlignBottomOutlined,
  VerticalAlignMiddleOutlined,
  CloseOutlined,
  LeftOutlined,
  SkinFilled,
} from '@ant-design/icons';
import { NotFound, AuthButton } from 'components';
import Terminal from './Terminal';
import FileManager from './FileManager';
import Setting from './Setting';
import { http, hasPermission, includes } from 'libs';
import gStore from 'gStore';
import styles from './index.module.less';
import LogoSpugText from 'layout/logo-spug-white.png';
import lds from 'lodash';

let posX = 0

function WebSSH(props) {
  const [visible, setVisible] = useState(false);
  const [visible2, setVisible2] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [rawTreeData, setRawTreeData] = useState([]);
  const [rawHostList, setRawHostList] = useState([]);
  const [treeData, setTreeData] = useState([]);
  const [searchValue, setSearchValue] = useState();
  const [hosts, setHosts] = useState([]);
  const [activeId, setActiveId] = useState();
  const [hostId, setHostId] = useState();
  const [width, setWidth] = useState(280);
  const [sshMode] = useState(hasPermission('host.console.view'))

  useEffect(() => {
    window.document.title = 'Spug web terminal'
    window.addEventListener('beforeunload', leaveTips)
    fetchNodes()
    gStore.fetchUserSettings()
    return () => window.removeEventListener('beforeunload', leaveTips)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (searchValue) {
      const newTreeData = rawHostList.filter(x => includes([x.title, x.hostname], searchValue))
      setTreeData(newTreeData)
    } else {
      setTreeData(rawTreeData)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue])

  function leaveTips(e) {
    e.returnValue = '确定要离开页面？'
  }

  function fetchNodes() {
    setFetching(true)
    http.get('/api/host/group/?with_hosts=1')
      .then(res => {
        const tmp = {}
        setRawTreeData(res.treeData)
        setTreeData(res.treeData)
        const loop = (data) => {
          for (let item of data) {
            if (item.children) {
              loop(item.children)
            } else if (item.isLeaf) {
              tmp[item.id] = item
            }
          }
        }
        loop(res.treeData)
        setRawHostList(Object.values(tmp))
        const query = new URLSearchParams(props.location.search);
        const id = query.get('id');
        if (id) {
          const node = lds.find(Object.values(tmp), {id: Number(id)})
          if (node) _openNode(node)
        }
      })
      .finally(() => setFetching(false))
  }

  function _openNode(node, replace) {
    const newNode = {...node}
    newNode.vId = String(new Date().getTime())
    if (replace) {
      const index = lds.findIndex(hosts, {vId: node.vId})
      if (index >= 0) hosts[index] = newNode
    } else {
      hosts.push(newNode);
    }
    setHosts(lds.cloneDeep(hosts))
    setActiveId(newNode.vId)
  }

  function handleSelect(e) {
    if (e.nativeEvent.detail > 1 && e.node.isLeaf) {
      _openNode(e.node)
    }
  }

  function handleRemove(key, target) {
    const index = lds.findIndex(hosts, x => x.vId === key);
    if (index === -1) return;
    switch (target) {
      case 'self':
        hosts.splice(index, 1)
        setHosts([...hosts])
        if (hosts.length > index) {
          setActiveId(hosts[index].vId)
        } else if (hosts.length) {
          setActiveId(hosts[index - 1].vId)
        } else {
          setActiveId(undefined)
        }
        break
      case 'right':
        hosts.splice(index + 1, hosts.length)
        setHosts([...hosts])
        setActiveId(key)
        break
      case 'other':
        setHosts([hosts[index]])
        setActiveId(key)
        break
      case 'all':
        setHosts([])
        setActiveId(undefined)
        break
      default:
        break
    }
  }

  function handleOpenFileManager() {
    const index = lds.findIndex(hosts, x => x.vId === activeId);
    if (index !== -1) {
      setHostId(hosts[index].id)
      setVisible(true)
    }
  }

  function renderIcon(node) {
    if (node.isLeaf) {
      return <CloudServerOutlined/>
    } else if (node.expanded) {
      return <FolderOpenOutlined/>
    } else {
      return <FolderOutlined/>
    }
  }

  function handleMouseMove(e) {
    if (posX) {
      setWidth(e.pageX);
    }
  }

  function handeTabAction(action, host, e) {
    if (e) e.stopPropagation()
    switch (action) {
      case 'copy':
        return _openNode(host)
      case 'reconnect':
        return _openNode(host, true)
      case 'rClose':
        return handleRemove(host.vId, 'right')
      case 'oClose':
        return handleRemove(host.vId, 'other')
      case 'aClose':
        return handleRemove(host.vId, 'all')
      default:
        break
    }
  }

  function TabRender(props) {
    const host = props.host;
    return (
      <Dropdown trigger={['contextMenu']} overlay={(
        <Menu onClick={({key, domEvent}) => handeTabAction(key, host, domEvent)}>
          <Menu.Item key="copy" icon={<CopyOutlined/>}>复制窗口</Menu.Item>
          <Menu.Item key="reconnect" icon={<ReloadOutlined/>}>重新连接</Menu.Item>
          <Menu.Item key="rClose"
                     icon={<VerticalAlignBottomOutlined style={{transform: 'rotate(90deg)'}}/>}>关闭右侧</Menu.Item>
          <Menu.Item key="oClose"
                     icon={<VerticalAlignMiddleOutlined style={{transform: 'rotate(90deg)'}}/>}>关闭其他</Menu.Item>
          <Menu.Item key="aClose" icon={<CloseOutlined/>}>关闭所有</Menu.Item>
        </Menu>
      )}>
        <div className={styles.tabRender} onDoubleClick={() => handeTabAction('copy', host)}>{host.title}</div>
      </Dropdown>
    )
  }

  const spug_web_terminal =
    '                                                 __       __                          _                __\n' +
    '   _____ ____   __  __ ____ _   _      __ ___   / /_     / /_ ___   _____ ____ ___   (_)____   ____ _ / /\n' +
    '  / ___// __ \\ / / / // __ `/  | | /| / // _ \\ / __ \\   / __// _ \\ / ___// __ `__ \\ / // __ \\ / __ `// / \n' +
    ' (__  )/ /_/ // /_/ // /_/ /   | |/ |/ //  __// /_/ /  / /_ /  __// /   / / / / / // // / / // /_/ // /  \n' +
    '/____// .___/ \\__,_/ \\__, /    |__/|__/ \\___//_.___/   \\__/ \\___//_/   /_/ /_/ /_//_//_/ /_/ \\__,_//_/   \n' +
    '     /_/            /____/                                                                               \n'

  return hasPermission('host.console.view|host.console.list') ? (
    <div className={styles.container} onMouseUp={() => posX = 0} onMouseMove={handleMouseMove}>
      <div className={styles.sider} style={{width}}>
        <a className={styles.logo} href="/host" target="_blank">
          <img src={LogoSpugText} alt="logo"/>
        </a>
        <div className={styles.hosts}>
          <Spin spinning={fetching}>
            <Input allowClear className={styles.search} prefix={<SearchOutlined style={{color: '#999'}}/>}
                   placeholder="输入主机名/IP检索" onChange={e => setSearchValue(e.target.value)}/>
            <Button icon={<SyncOutlined/>} type="link" loading={fetching} onClick={fetchNodes}/>
            {treeData.length > 0 ? (
              <Tree.DirectoryTree
                defaultExpandAll={treeData.length > 0 && treeData.length < 5}
                expandAction="doubleClick"
                treeData={treeData}
                icon={renderIcon}
                onSelect={(k, e) => handleSelect(e)}/>
            ) : null}
          </Spin>
        </div>
        <div className={styles.split} onMouseDown={e => posX = e.pageX}/>
      </div>
      <div className={styles.content}>
        <Tabs
          hideAdd
          activeKey={activeId}
          type="editable-card"
          onTabClick={key => setActiveId(key)}
          onEdit={(key, action) => action === 'remove' ? handleRemove(key, 'self') : null}
          style={{background: '#fff', width: `calc(100vw - ${width}px)`}}
          tabBarExtraContent={hosts.length === 0 ? (
            <div className={styles.tips}>小提示：双击标签快速复制窗口，右击标签展开更多操作。</div>
          ) : sshMode ? (
            <React.Fragment>
              <AuthButton
                auth="host.console.list"
                type="link"
                disabled={!activeId}
                onClick={handleOpenFileManager}
                icon={<LeftOutlined/>}>文件管理器</AuthButton>
              <SkinFilled className={styles.setting} onClick={() => setVisible2(true)}/>
            </React.Fragment>
          ) : null}>
          {hosts.map(item => (
            <Tabs.TabPane key={item.vId} tab={<TabRender host={item}/>}>
              {sshMode ? (
                <Terminal id={item.id} vId={item.vId} activeId={activeId}/>
              ) : (
                <div className={styles.fileManger}>
                  <FileManager id={item.id}/>
                </div>
              )}
            </Tabs.TabPane>
          ))}
        </Tabs>
        {hosts.length === 0 && (
          <pre className={sshMode ? styles.fig : styles.fig2}>{spug_web_terminal}</pre>
        )}
      </div>
      <Drawer
        title="文件管理器"
        placement="right"
        width={900}
        className={styles.drawerContainer}
        visible={visible}
        onClose={() => setVisible(false)}>
        <FileManager id={hostId}/>
      </Drawer>
      <Setting visible={visible2} onClose={() => setVisible2(false)}/>
    </div>
  ) : (
    <div style={{height: '100vh'}}>
      <NotFound/>
    </div>
  )
}

export default observer(WebSSH)