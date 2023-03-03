/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import Node from './Node';
import S from './store';
import css from './sider.module.less';


function Sider() {
  function handleClick(node) {
    if (['ssh_exec', 'data_transfer'].includes(node.module)) {
      node._id = `${node.id}.${node._targets[0].id}`
    }
    S.node = node
  }

  return (
    <div className={css.sider}>
      {S.matrixNodes.map((row, idx) => (
        <div key={idx} style={{display: 'flex', flexDirection: 'row'}}>
          {row.map((item, idx) => (
            <Node key={idx} node={item} onClick={() => handleClick(item)}/>
          ))}
        </div>
      ))}
    </div>
  )
}

export default observer(Sider)