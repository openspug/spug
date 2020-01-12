import React from 'react';
import { hasPermission } from "../libs";


export default function AuthDiv(props) {
  const disabled = props.auth && !hasPermission(props.auth);
  return disabled ? null : <div {...props}>{props.children}</div>
}