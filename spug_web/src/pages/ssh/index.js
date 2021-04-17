/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react';
import { Tabs, Tree, Button, Spin } from 'antd';
import { FolderOutlined, FolderOpenOutlined, CloudServerOutlined } from '@ant-design/icons';
import Terminal from './Terminal';
import FileManager from './FileManager';
import { http } from 'libs';
import styles from './index.module.less';
import LogoSpugText from 'layout/logo-spug-txt.png';
import lds from 'lodash';


function WebSSH(props) {
  const [visible, setVisible] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [treeData, setTreeData] = useState([]);
  const [hosts, setHosts] = useState([]);
  const [activeId, setActiveId] = useState();

  useEffect(() => {
    window.document.title = 'Spug web terminal'
    window.addEventListener('beforeunload', leaveTips)
    http.get('/api/host/group/?with_hosts=1')
      .then(res => setTreeData(res.treeData))
      .finally(() => setFetching(false))
    return () => window.removeEventListener('beforeunload', leaveTips)
  }, [])

  function leaveTips(e) {
    e.returnValue = '确定要离开页面？'
  }

  function handleSelect(e) {
    if (e.nativeEvent.detail > 1 && e.node.isLeaf) {
      if (!lds.find(hosts, x => x.id === e.node.id)) {
        hosts.push(e.node);
        setHosts(lds.cloneDeep(hosts))
      }
      setActiveId(String(e.node.id))
    }
  }

  function handleRemove(key, action) {
    if (action === 'remove') {
      const index = lds.findIndex(hosts, x => String(x.id) === key);
      if (index !== -1) {
        hosts.splice(index, 1);
        setHosts(lds.cloneDeep(hosts));
        if (hosts.length > index) {
          setActiveId(String(hosts[index].id))
        } else if (hosts.length) {
          setActiveId(String(hosts[index - 1].id))
        }
      }
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

  const spug_web_terminal =
    '                                                 __       __                          _                __\n' +
    '   _____ ____   __  __ ____ _   _      __ ___   / /_     / /_ ___   _____ ____ ___   (_)____   ____ _ / /\n' +
    '  / ___// __ \\ / / / // __ `/  | | /| / // _ \\ / __ \\   / __// _ \\ / ___// __ `__ \\ / // __ \\ / __ `// / \n' +
    ' (__  )/ /_/ // /_/ // /_/ /   | |/ |/ //  __// /_/ /  / /_ /  __// /   / / / / / // // / / // /_/ // /  \n' +
    '/____// .___/ \\__,_/ \\__, /    |__/|__/ \\___//_.___/   \\__/ \\___//_/   /_/ /_/ /_//_//_/ /_/ \\__,_//_/   \n' +
    '     /_/            /____/                                                                               \n'

  return (
    <div className={styles.container}>
      <div className={styles.sider}>
        <div className={styles.logo}>
          <img src={LogoSpugText} alt="logo"/>
        </div>
        <div className={styles.hosts}>
          <Spin spinning={fetching}>
            <Tree.DirectoryTree
              defaultExpandAll
              expandAction="doubleClick"
              treeData={treeData}
              icon={renderIcon}
              onSelect={(k, e) => handleSelect(e)}/>
          </Spin>
        </div>
      </div>
      <div className={styles.content}>
        <Tabs
          hideAdd
          activeKey={activeId}
          type="editable-card"
          onTabClick={key => setActiveId(key)}
          onEdit={handleRemove}
          tabBarExtraContent={<Button
            type="primary"
            style={{marginRight: 5}}
            onClick={() => setVisible(true)}
            icon={<FolderOpenOutlined/>}>文件管理器</Button>}>
          {hosts.map(item => (
            <Tabs.TabPane key={item.id} tab={item.title}>
              <Terminal id={item.id} activeId={activeId}/>
            </Tabs.TabPane>
          ))}
        </Tabs>
        <pre className={styles.fig}>{spug_web_terminal}</pre>
      </div>
      <FileManager id={activeId} visible={visible} onClose={() => setVisible(false)}/>
    </div>
  )
}

export default observer(WebSSH)