/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useEffect, useRef } from 'react';
import { FitAddon } from 'xterm-addon-fit';
import { Terminal } from 'xterm';

function OutView(props) {
  const el = useRef()

  useEffect(() => {
    setTimeout(() => {
      const fitPlugin = new FitAddon()
      const term = new Terminal({disableStdin: true})
      term.setOption('fontFamily', 'source-code-pro, Menlo, Monaco, Consolas, PingFang SC, Microsoft YaHei')
      term.loadAddon(fitPlugin)
      term.setOption('theme', {background: '#fff', foreground: '#000', selection: '#999'})
      term.open(el.current)
      fitPlugin.fit()
      props.setTerm(term)
    }, 100)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{padding: '8px 0 0 15px'}}>
      <div ref={el} style={{height: 300}}/>
    </div>
  )
}

export default OutView