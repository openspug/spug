/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { Input, Card, Tree, Dropdown, Menu, Switch, Tooltip, Spin, Modal } from 'antd';
import {
  FolderOutlined,
  FolderAddOutlined,
  FolderOpenOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  CloseOutlined,
  ScissorOutlined,
  LoadingOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import { AuthFragment } from 'components';
import { hasPermission, http } from 'libs';
import styles from './index.module.less';
import store from './store';
import lds from 'lodash';

export default observer(function () {
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState();
  const [visible, setVisible] = useState(false);
  const [draggable, setDraggable] = useState(false);
  const [action, setAction] = useState('');
  const [expands, setExpands] = useState([]);
  const [bakTreeData, setBakTreeData] = useState();

  useEffect(() => {
    if (loading === false) store.fetchGroups()
  }, [loading])

  useEffect(() => {
    if (!isReady) {
      const length = store.treeData.length
      if (length > 0 && length < 5) {
        const tmp = store.treeData.filter(x => x.children.length)
        setExpands(tmp.map(x => x.key))
        setIsReady(true)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.treeData])

  const menus = (
    <Menu onClick={() => setVisible(false)}>
      <Menu.Item key="0" icon={<FolderOutlined/>} onClick={handleAddRoot}>新建根分组</Menu.Item>
      <Menu.Item key="1" icon={<FolderAddOutlined/>} onClick={handleAdd}>新建子分组</Menu.Item>
      <Menu.Item key="2" icon={<EditOutlined/>} onClick={() => setAction('edit')}>重命名</Menu.Item>
      <Menu.Divider/>
      <Menu.Item key="3" icon={<CopyOutlined/>} onClick={() => store.showSelector(true)}>添加主机</Menu.Item>
      <Menu.Item key="4" icon={<ScissorOutlined/>} onClick={() => store.showSelector(false)}>移动主机</Menu.Item>
      <Menu.Item key="5" icon={<CloseOutlined/>} danger onClick={handleRemoveHosts}>删除主机</Menu.Item>
      <Menu.Divider/>
      <Menu.Item key="6" icon={<DeleteOutlined/>} danger onClick={handleRemove}>删除此分组</Menu.Item>
    </Menu>
  )

  function handleSubmit() {
    if (store.group.title) {
      setLoading(true);
      const {key, parent_id, title} = store.group;
      http.post('/api/host/group/', {id: key || undefined, parent_id, name: title})
        .then(() => setAction(''))
        .finally(() => setLoading(false))
    } else {
      if (store.group.key === 0) store.rawTreeData = bakTreeData
      setAction('')
    }
  }

  function handleRemoveHosts() {
    const group = store.group;
    Modal.confirm({
      title: '操作确认',
      content: `批量删除【${group.title}】分组内的 ${store.counter[group.key].size} 个主机？`,
      onOk: () => http.delete('/api/host/', {params: {group_id: group.key}})
        .then(store.fetchRecords)
    })
  }

  function handleRemove() {
    setAction('del');
    setLoading(true);
    http.delete('/api/host/group/', {params: {id: store.group.key}})
      .finally(() => {
        setAction('');
        setLoading(false)
      })
  }

  function handleAddRoot() {
    setBakTreeData(lds.cloneDeep(store.rawTreeData));
    const current = {key: 0, parent_id: 0, title: '', children: []};
    store.rawTreeData.unshift(current);
    store.rawTreeData = lds.cloneDeep(store.rawTreeData);
    store.group = current;
    setAction('edit')
  }

  function handleAdd() {
    setBakTreeData(lds.cloneDeep(store.rawTreeData));
    const current = {key: 0, parent_id: store.group.key, title: '', children: []};
    const node = _find_node(store.rawTreeData, store.group.key)
    node.children.unshift(current)
    store.rawTreeData = lds.cloneDeep(store.rawTreeData);
    if (!expands.includes(store.group.key)) setExpands([store.group.key, ...expands]);
    store.group = current;
    setAction('edit')
  }

  function _find_node(list, key) {
    let node = lds.find(list, {key})
    if (node) return node
    for (let item of list) {
      node = _find_node(item.children, key)
      if (node) return node
    }
  }

  function handleDrag(v) {
    setLoading(true);
    const pos = v.node.pos.split('-');
    const dropPosition = v.dropPosition - Number(pos[pos.length - 1]);
    http.patch('/api/host/group/', {s_id: v.dragNode.key, d_id: v.node.key, action: dropPosition})
      .then(() => setLoading(false))
  }

  function handleRightClick(v) {
    if (hasPermission('admin')) {
      store.group = v.node;
      setVisible(true)
    }
  }

  function handleExpand(keys, {_, node}) {
    if (node.children.length > 0) {
      setExpands(keys)
    }
  }

  function treeRender(nodeData) {
    if (action === 'edit' && nodeData.key === store.group.key) {
      return <Input
        autoFocus
        size="small"
        style={{width: 'calc(100% - 24px)'}}
        defaultValue={nodeData.title}
        placeholder="请输入"
        suffix={loading ? <LoadingOutlined/> : <span/>}
        onClick={e => e.stopPropagation()}
        onBlur={handleSubmit}
        onChange={e => store.group.title = e.target.value}
        onPressEnter={handleSubmit}/>
    } else if (action === 'del' && nodeData.key === store.group.key) {
      return <LoadingOutlined style={{marginLeft: '4px'}}/>
    } else {
      const length = store.counter[nodeData.key]?.size
      return (
        <div className={styles.treeNode}>
          {expands.includes(nodeData.key) ? <FolderOpenOutlined/> : <FolderOutlined/>}
          <div className={styles.title}>{nodeData.title}</div>
          {length ? <div className={styles.number}>{length}</div> : null}
        </div>
      )
    }
  }

  const treeData = store.treeData;
  return (
    <Card
      title="分组列表"
      className={styles.group}
      extra={(
        <AuthFragment auth="admin">
          <Switch
            checked={draggable}
            onChange={setDraggable}
            checkedChildren="排版"
            unCheckedChildren="浏览"/>
          <Tooltip title="排版模式下，可通过拖拽分组实现快速排序，右键点击分组进行分组管理。">
            <QuestionCircleOutlined style={{marginLeft: 8, color: '#999'}}/>
          </Tooltip>
        </AuthFragment>)}>
      <Spin spinning={store.grpFetching}>
        <Dropdown
          overlay={menus}
          visible={visible}
          trigger={['contextMenu']}
          onVisibleChange={v => v || setVisible(v)}>
          <Tree.DirectoryTree
            showIcon={false}
            autoExpandParent
            expandAction="doubleClick"
            draggable={draggable}
            treeData={treeData}
            titleRender={treeRender}
            expandedKeys={expands}
            selectedKeys={[store.group.key]}
            onSelect={(_, {node}) => store.group = node}
            onExpand={handleExpand}
            onDrop={handleDrag}
            onRightClick={handleRightClick}
          />
        </Dropdown>
      </Spin>
      {treeData.length === 1 && treeData[0].children.length === 0 && (
        <div style={{color: '#999', marginTop: 20, textAlign: 'center'}}>右键点击分组进行分组管理哦~</div>
      )}
      {store.records && treeData.length === 0 && (
        <div style={{color: '#999'}}>你还没有可访问的主机分组，请联系管理员分配主机权限。</div>
      )}
    </Card>
  )
})
