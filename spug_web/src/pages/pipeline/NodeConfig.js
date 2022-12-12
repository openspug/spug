/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { Drawer, Form, Radio, Button, Input, message } from 'antd';
import { AppstoreOutlined, SettingOutlined } from '@ant-design/icons';
import Icon from './Icon';
import { ACEditor } from 'components';
import HostSelector from 'pages/host/Selector';
import { clsNames } from 'libs';
import S from './store';
import css from './nodeConfig.module.less';
import { NODES } from './data'

function NodeConfig(props) {
  const [tab, setTab] = useState('node')
  const [form] = Form.useForm()

  useEffect(() => {
    setTab(S.node.module ? 'conf' : 'node')
    form.setFieldsValue(S.node)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [S.node])

  function handleNode({module, name}) {
    S.node.module = module
    if (!S.node.name) S.node.name = name
    setTab('conf')
    S.node = {...S.node}
  }

  function handleSave() {
    message.success('保存成功')
    const data = form.getFieldsValue()
    Object.assign(S.node, data)
    props.doRefresh(S.node)
  }

  const visible = !!S.node.id
  return (
    <Drawer
      open={visible}
      width={500}
      mask={false}
      closable={false}
      getContainer={false}
      bodyStyle={{padding: 0, position: 'relative'}}>
      <div className={css.container} onClick={e => e.stopPropagation()}>
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
                <Icon size={36} module={item.module}/>
                <div className={css.title}>{item.name}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={css.body} style={{display: tab === 'conf' ? 'block' : 'none'}}>
          <Form layout="vertical" form={form}>
            <Form.Item required name="name" label="节点名称">
              <Input placeholder="请输入节点名称"/>
            </Form.Item>
            <Form.Item required name="targets" label="选择主机">
              <HostSelector type="button"/>
            </Form.Item>
            <Form.Item required name="interpreter" label="执行解释器">
              <Radio.Group buttonStyle="solid">
                <Radio.Button value="sh">Shell</Radio.Button>
                <Radio.Button value="python">Python</Radio.Button>
              </Radio.Group>
            </Form.Item>
            <Form.Item required label="执行内容" shouldUpdate={(p, c) => p.interpreter !== c.interpreter}>
              {({getFieldValue}) => (
                <Form.Item name="command" noStyle>
                  <ACEditor
                    mode={getFieldValue('interpreter')}
                    onChange={val => console.log(val)}
                    width="464px"
                    height="220px"/>
                </Form.Item>
              )}
            </Form.Item>
          </Form>
        </div>
        <div className={css.footer} style={{display: tab === 'conf' ? 'block' : 'none'}}>
          <Button type="primary" onClick={handleSave}>保存</Button>
        </div>
      </div>
    </Drawer>
  )
}

export default observer(NodeConfig)