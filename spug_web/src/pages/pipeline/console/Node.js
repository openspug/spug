/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react'
import { observer } from 'mobx-react';
import { LoadingOutlined } from '@ant-design/icons';
import Icon from '../Icon';
import { clsNames } from 'libs';
import S from './store';
import css from './node.module.less';

function Node(props) {
  const node = props.node
  switch (node) {
    case '  ':
      return <div className={css.box}/>
    case ' -':
      return <div className={clsNames(css.box, css.line)}/>
    case '--':
      return <div className={clsNames(css.box, css.line, css.line2)}/>
    case ' 7':
      return <div className={clsNames(css.box, css.angle)}/>
    case '-7':
      return <div className={clsNames(css.box, css.angle, css.angle2)}/>
    case ' |':
      return (
        <div className={clsNames(css.box, css.arrow)}>
          <div className={css.triangle}/>
        </div>
      )
    default:
      return (
        <div className={clsNames(css.box, css.node, S.node?.id === node.id && css.active)} onClick={props.onClick}>
          {S.outputs[node.id]?.status === 'processing' ? <LoadingOutlined className={css.loading}/> : null}
          <Icon size={36} module={node.module}/>
        </div>
      )
  }
}

export default observer(Node)