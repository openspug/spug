/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react'


function Container(props) {
  const {visible, style, className} = props;

  return (
    <div style={{display: visible ? 'block' : 'none', ...style}} className={className}>
      {props.children}
    </div>
  )
}

Container.defaultProps = {
  visible: true
}

export default Container
