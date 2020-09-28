/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Divider, Button } from 'antd';
import { hasPermission } from 'libs';

function canVisible(auth) {
  return !auth || hasPermission(auth)
}

class Action extends React.Component {
  static Link(props) {
    return <Link {...props}/>
  }

  static Button(props) {
    return <Button type="link" {...props} style={{padding: 0}}/>
  }

  render() {
    const children = [];
    this.props.children.forEach((el, index) => {
      if (canVisible(el.props.auth)) {
        if (children.length !== 0) children.push(<Divider key={index} type="vertical"/>);
        children.push(el)
      }
    })

    return <span>
      {children}
    </span>
  }
}

export default Action
