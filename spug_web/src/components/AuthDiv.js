/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { hasPermission } from "../libs";
import PageWrapper from './PageWrapper';

export default function AuthDiv(props) {
  let disabled = props.disabled === undefined ? false : props.disabled;
  if (props.auth && !hasPermission(props.auth)) {
    disabled = true;
  }
  return disabled ? null : (props.auth.indexOf('add')===-1?<PageWrapper breadcrumbs={props.breadcrumbs}><div {...props}>{props.children}</div></PageWrapper>:<div {...props}>{props.children}</div>)
}
