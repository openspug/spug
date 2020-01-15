/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { hasPermission } from "../libs";


export default function AuthDiv(props) {
  let disabled = props.disabled === undefined ? false : props.disabled;
  if (props.auth && !hasPermission(props.auth)) {
    disabled = true;
  }
  return disabled ? null : <div {...props}>{props.children}</div>
}
