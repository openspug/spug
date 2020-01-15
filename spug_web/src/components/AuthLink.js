/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import {Link} from 'react-router-dom';
import { hasPermission } from 'libs';


export default function AuthLink(props) {
  let disabled = props.disabled;
  if (props.auth && !hasPermission(props.auth)) {
    disabled = true;
  }
  return <Link {...props} disabled={disabled}>{props.children}</Link>
}
