import React from 'react';
import { hasPermission } from 'libs';


export default function AuthFragment(props) {
  return hasPermission(props.auth) ? <React.Fragment>{props.children}</React.Fragment> : null
}
