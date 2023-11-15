/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react'


function Link(props) {
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      href={props.href}
      className={props.className}>
      {props.title}</a>
  )
}

export default Link