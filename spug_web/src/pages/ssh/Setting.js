/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { Drawer, Form, Button, Select, Space, message } from 'antd';
import themes from './themes';
import gStore from 'gStore';
import css from './setting.module.less'

function Setting(props) {
  const [theme, setTheme] = useState('dark')
  const [styles, setStyles] = useState(themes['dark'])
  const [fontSize, setFontSize] = useState(14)
  const [fontFamily, setFontFamily] = useState('Courier')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const {theme, styles, fontSize, fontFamily} = gStore.terminal
    setTheme(theme)
    setStyles(styles)
    setFontSize(fontSize)
    setFontFamily(fontFamily)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gStore.terminal])

  useEffect(() => {
    setStyles(themes[theme])
  }, [theme])

  function handleSubmit() {
    setLoading(true)
    const data = {fontSize, fontFamily, theme}
    gStore.updateUserSettings('terminal', JSON.stringify(data))
      .then(() => {
        message.success('已保存')
        props.onClose()
      })
      .finally(() => setLoading(false))
  }

  return (<Drawer
      title="终端设置"
      placement="right"
      width={300}
      visible={props.visible}
      onClose={props.onClose}>
      <Form layout="vertical">
        <Form.Item label="字体大小">
          <Select value={fontSize} placeholder="请选择字体大小" onChange={v => setFontSize(v)}>
            <Select.Option value={12}>12</Select.Option>
            <Select.Option value={14}>14</Select.Option>
            <Select.Option value={16}>16</Select.Option>
            <Select.Option value={18}>18</Select.Option>
            <Select.Option value={20}>20</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="字体名称">
          <Select value={fontFamily} placeholder="请选择字体" onChange={v => setFontFamily(v)}>
            <Select.Option value="Courier">Courier</Select.Option>
            <Select.Option value="Consolas">Consolas</Select.Option>
            <Select.Option value="DejaVu Sans Mono">DejaVu Sans Mono</Select.Option>
            <Select.Option value="Droid Sans Mono">Droid Sans Mono</Select.Option>
            <Select.Option value="Monaco">Monaco</Select.Option>
            <Select.Option value="Menlo">Menlo</Select.Option>
            <Select.Option value="monospace">monospace</Select.Option>
            <Select.Option value="Source Code Pro">Source Code Pro</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="主题配色">
          <Space wrap className={css.theme} size={12}>
            {Object.entries(themes).map(([key, item]) => (
              <pre key={key} style={{background: item.background, color: item.foreground}}
                   onClick={() => setTheme(key)}>spug</pre>))}
          </Space>
        </Form.Item>
        <Form.Item label="预览">
          <div className={css.preview}
               style={{fontSize, fontFamily, background: styles.background, color: styles.foreground}}>
            <div>Welcome to Spug !</div>
            <div>* Website: https://spug.cc</div>
            <div>[root@iZ8vb48roZ ~]# ls</div>
            <div>
              <span style={{color: styles.brightBlue}}>apps </span>
              <span style={{color: styles.brightRed}}>bak.tar.gz </span>
              <span style={{color: styles.brightGreen}}>manage.py </span>
              <span>README.md</span>
            </div>
            <div>[root@iZ8vb48roZ ~]# pwd</div>
            <div>/data/api</div>
            <div>[root@iZ8vb48roZ ~]#</div>
          </div>
        </Form.Item>
        <Button block type="primary" className={css.btn} loading={loading} onClick={handleSubmit}>保存</Button>
      </Form>
    </Drawer>)
}

export default Setting