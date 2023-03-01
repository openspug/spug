/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { observer } from 'mobx-react';
import { Button, message } from 'antd';
import { RollbackOutlined, EditOutlined } from '@ant-design/icons';
import NodeConfig from './NodeConfig';
import PipeForm from './Form';
import Node from './Node';
import { transfer } from './utils';
import { history } from 'libs';
import S from './store';
import lds from 'lodash';
import css from './editor.module.less';

function Editor(props) {
  const params = useParams()
  const [nodes, setNodes] = useState([])
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (params.id === 'new') {
      S.record = {name: '新建流水线', nodes: []}
      handleAddDownstream()
    } else {
      S.fetchRecord(params.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if ((S.record?.nodes ?? []).length) {
      const data = transfer(S.record.nodes)
      setNodes(data)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [S.record])

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
    for (let idx in S.record.nodes) {
      const node = S.record.nodes[idx]
      if (node.id === id) {
        index = Number(idx)
      }
      if (node.downstream) {
        idx = node.downstream.indexOf(id)
        if (idx >= 0) {
          upNode = node
          streamIdx = idx
        }
      }
    }
    return [index, upNode, streamIdx]
  }

  function handleAddUpstream() {
    const oldID = S.actionNode.id
    const newID = new Date().getTime()
    const newNode = {id: newID, downstream: [oldID]}
    const [index, upNode, streamIdx] = _findIndexAndUpNode()
    if (upNode) upNode.downstream.splice(streamIdx, 1, newID)
    S.record.nodes.splice(index, 0, newNode)
    S.record = {...S.record}
    S.node = newNode
  }

  function handleAddDownstream() {
    const oldID = S.actionNode.id
    const newID = new Date().getTime()
    const newNode = {id: new Date().getTime()}
    if (S.record.nodes.length) {
      const idx = lds.findIndex(S.record.nodes, {id: oldID})
      if (S.record.nodes[idx].downstream) {
        S.record.nodes[idx].downstream.push(newID)
      } else {
        S.record.nodes[idx].downstream = [newID]
      }
      S.record.nodes.splice(idx + 1, 0, newNode)
    } else {
      S.record.nodes = [newNode]
    }
    S.record = {...S.record}
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
    S.record.nodes.splice(index, 1)
    S.record = {...S.record}
    S.updateRecord()
  }

  function handleRefresh(node) {
    const index = lds.findIndex(S.record.nodes, {id: node.id})
    S.record.nodes.splice(index, 1, node)
    return S.updateRecord()
  }

  return (
    <div className={css.container} onMouseDown={() => S.node = {}}>
      <div className={css.header}>
        <div className={css.title}>{S.record.name}</div>
        <EditOutlined className={css.edit} onClick={() => setVisible(true)}/>
        <div style={{flex: 1}}/>
        <Button className={css.back} type="link" icon={<RollbackOutlined/>}
                onClick={() => history.goBack()}>返回列表</Button>
      </div>
      <div className={css.body}>
        <div className={css.nodes}>
          {nodes.map((row, idx) => (
            <div key={idx} className={css.row}>
              {row.map((item, idx) => (
                <Node key={idx} node={item} onAction={handleAction}/>
              ))}
            </div>
          ))}
        </div>
        <NodeConfig doRefresh={handleRefresh}/>
      </div>
      {visible && <PipeForm onCancel={() => setVisible(false)}/>}
    </div>
  )
}

export default observer(Editor)