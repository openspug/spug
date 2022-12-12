/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { PlusOutlined } from '@ant-design/icons';
import { message } from 'antd';
import NodeConfig from './NodeConfig';
import Node from './Node';
import { transfer } from './utils';
import S from './store';
import lds from 'lodash';
import css from './editor.module.less';

function Editor(props) {
  const [record, setRecord] = useState({})
  const [nodes, setNodes] = useState([])

  useEffect(() => {
    const data = transfer(record.pipeline || [])
    setNodes(data)
  }, [record])

  function handleAction({key, domEvent}) {
    domEvent.stopPropagation()
    switch (key) {
      case 'upstream':
        return handleAddUpstream()
      case 'downstream':
        return handleAddDownstream()
      case 'delete':
        return handleDelNode()
      default:
        return
    }
  }

  function _findIndexAndUpNode() {
    let index
    let [upNode, streamIdx] = [null, null]
    const id = S.actionNode.id
    for (let idx in record.pipeline) {
      const node = record.pipeline[idx]
      if (node.id === id) {
        index = Number(idx)
      }
      idx = lds.findIndex(node.downstream, {id})
      if (idx >= 0) {
        upNode = node
        streamIdx = idx
      }
    }
    return [index, upNode, streamIdx]
  }

  function handleAddUpstream() {
    const oldID = S.actionNode.id
    const newID = new Date().getTime()
    const [index, upNode, streamIdx] = _findIndexAndUpNode()
    if (upNode) upNode.downstream.splice(streamIdx, 1, {id: newID})
    record.pipeline.splice(index, 0, {id: newID, downstream: [{id: oldID}]})
    setRecord(Object.assign({}, record))
  }

  function handleAddDownstream(e) {
    if (e) e.stopPropagation()
    const oldID = S.actionNode.id
    const newNode = {id: new Date().getTime()}
    if (record.pipeline) {
      const idx = lds.findIndex(record.pipeline, {id: oldID})
      if (record.pipeline[idx].downstream) {
        record.pipeline[idx].downstream.push(newNode)
      } else {
        record.pipeline[idx].downstream = [newNode]
      }
      record.pipeline.splice(idx + 1, 0, newNode)
    } else {
      record.pipeline = [newNode]
    }
    setRecord(Object.assign({}, record))
    S.node = newNode
  }

  function handleDelNode() {
    const {downstream} = S.actionNode
    const [index, upNode, streamIdx] = _findIndexAndUpNode()
    if (index === 0 && downstream && downstream.length > 1) {
      return message.error('该节点为起始节点且有多个下游节点无法删除')
    }
    if (upNode) {
      upNode.downstream.splice(streamIdx, 1)
      if (downstream) {
        for (let item of downstream.slice().reverse()) {
          upNode.downstream.splice(streamIdx, 0, item)
        }
      }
    }
    record.pipeline.splice(index, 1)
    setRecord(Object.assign({}, record))
  }

  function handleRefresh(node) {
    const index = lds.findIndex(record.pipeline, {id: node.id})
    record.pipeline.splice(index, 1, node)
    setRecord(Object.assign({}, record))
  }

  return (
    <div className={css.container} onClick={() => S.node = {}}>
      {nodes.map((row, idx) => (
        <div key={idx} className={css.row}>
          {row.map((item, idx) => (
            <Node key={idx} node={item} onAction={handleAction}/>
          ))}
        </div>
      ))}
      {nodes.length === 0 && (
        <div className={css.item} onClick={handleAddDownstream}>
          <div className={css.add}>
            <PlusOutlined className={css.icon}/>
          </div>
          <div className={css.title} style={{color: '#999999'}}>点击添加节点</div>
        </div>
      )}
      <NodeConfig doRefresh={handleRefresh}/>
    </div>
  )
}

export default observer(Editor)