/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { Link as ALink } from 'react-router-dom';
import { Divider, Button as AButton } from 'antd';
import { hasPermission } from 'libs';

function canVisible(auth) {
  return !auth || hasPermission(auth)
}

class Action extends React.Component {
  static Link(props) {
    return <ALink {...props}/>
  }

  static Button(props) {
    return <AButton type="link" {...props} style={{padding: 0}}/>
  }

  _handle = (data, el) => {
    const length = data.length;
    if (canVisible(el.props.auth)) {
      if (length !== 0) data.push(<Divider key={length} type="vertical"/>)
      data.push(el)
    }
  }

  render() {
    const children = [];
    if (Array.isArray(this.props.children)) {
      this.props.children.forEach(el => this._handle(children, el))
    } else {
      this._handle(children, this.props.children)
    }

    return <span>
      {children}
    </span>
  }
}

export default Action
