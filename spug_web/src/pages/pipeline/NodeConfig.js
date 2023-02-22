/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { Drawer, Button } from 'antd';
import { AppstoreOutlined, SettingOutlined } from '@ant-design/icons';
import ModuleConfig from './modules/index';
import Icon from './Icon';
import { clsNames } from 'libs';
import S from './store';
import css from './nodeConfig.module.less';
import { NODES } from './data'

function NodeConfig(props) {
  const [tab, setTab] = useState('node')
  const [loading, setLoading] = useState(false)
  const [handler, setHandler] = useState()

  useEffect(() => {
    setTab(S.node.module ? 'conf' : 'node')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [S.node])

  function handleNode({module, name}) {
    S.node.module = module
    if (!S.node.name) S.node.name = name
    setTab('conf')
    S.node = {...S.node}
  }

  function handleSave() {
    const data = handler()
    if (typeof data === 'object') {
      setLoading(true)
      Object.assign(S.node, data)
      props.doRefresh(S.node)
        .finally(() => setLoading(false))
    }
  }

  return (
    <Drawer
      open={!!S.node.id}
      width={500}
      mask={false}
      closable={false}
      getContainer={false}
      style={{marginTop: 12}}
      contentWrapperStyle={{overflow: 'hidden', borderTopLeftRadius: 6}}
      bodyStyle={{padding: 0, position: 'relative'}}>
      <div className={css.container} onMouseDown={e => e.stopPropagation()}>
        <div className={css.header}>
          <div className={clsNames(css.item, tab === 'node' && css.active)} onClick={() => setTab('node')}>
            <AppstoreOutlined/>
            <span>选择节点</span>
          </div>
          <div className={clsNames(css.item, tab === 'conf' && css.active)} onClick={() => setTab('conf')}>
            <SettingOutlined/>
            <span>节点配置</span>
          </div>
        </div>

        <div style={{marginTop: 72, display: tab === 'node' ? 'block' : 'none'}}>
          <div className={css.category}>内置节点</div>
          <div className={css.items}>
            {NODES.map(item => (
              <div key={item.module} className={clsNames(css.item, S.node?.module === item.module && css.active)}
                   onClick={() => handleNode(item)}>
                <Icon size={42} module={item.module}/>
                <div className={css.title}>{item.name}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={css.body} style={{display: tab === 'conf' ? 'block' : 'none'}}>
          <ModuleConfig node={S.node} setHandler={setHandler}/>
        </div>

        <div className={css.footer} style={{display: tab === 'conf' ? 'block' : 'none'}}>
          <Button type="primary" loading={loading} onClick={handleSave}>保存</Button>
        </div>
      </div>
    </Drawer>
  )
}

export default observer(NodeConfig)