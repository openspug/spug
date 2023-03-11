/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react'
import { observer } from 'mobx-react';
import { LoadingOutlined, CheckCircleFilled, ExclamationCircleFilled } from '@ant-design/icons';
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
      const status = S.outputs[node.id]?.status
      return (
        <div className={clsNames(css.box, css.node, S.node?.id === node.id && css.active)} onClick={props.onClick}>
          {status === 'processing' ? (
            <LoadingOutlined className={css.loading}/>
          ) : status === 'success' ? (
            <CheckCircleFilled className={css.success}/>
          ) : status === 'error' ? (
            <ExclamationCircleFilled className={css.error}/>
          ): null}
          <Icon size={36} module={node.module}/>
        </div>
      )
  }
}

export default observer(Node)