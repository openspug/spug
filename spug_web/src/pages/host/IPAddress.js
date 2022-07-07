/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';

function IPAddress(props) {
  const style = {
    background: '#ffe7ba',
    borderRadius: 4,
    color: '#333',
    fontSize: 10,
    marginRight: 4,
    padding: '0 8px'
  }

  const style2 = {
    background: '#bae7ff',
    borderRadius: 4,
    color: '#333',
    fontSize: 10,
    marginRight: 4,
    padding: '0 8px'
  }
  return (props.ip && props.ip.length > 0) ? (
    <div style={{width: 150, display: 'flex', alignItems: 'center'}}>
      {props.isPublic ? <span style={style}>公</span> : <span style={style2}>内</span>}
      <span>{props.ip[0]}</span>
    </div>
  ) : null
}

export default IPAddress
