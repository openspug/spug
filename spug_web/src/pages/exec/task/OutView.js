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
    const fitPlugin = new FitAddon()
    const term = new Terminal({disableStdin: true})
    term.loadAddon(fitPlugin)
    term.setOption('theme', {background: '#fff', foreground: '#000', selection: '#999'})
    term.open(el.current)
    const data = props.getOutput()
    if (data) term.write(data)
    term.fit = () => {
      const dimensions = fitPlugin.proposeDimensions()
      if (dimensions.cols && dimensions.rows) fitPlugin.fit()
    }
    props.setTerm(term)
    fitPlugin.fit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={el} style={{padding: '10px 15px'}}/>
  )
}

export default OutView