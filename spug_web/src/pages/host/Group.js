/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { Input, Card, Tree, Dropdown, Menu, Switch, message } from 'antd';
import {
  FolderOutlined,
  FolderAddOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  ScissorOutlined
} from '@ant-design/icons';
import { LoadingOutlined } from '@ant-design/icons';
import styles from './index.module.css';
import { http } from 'libs';
import store from './store';
import lds from 'lodash';

export default observer(function () {
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [draggable, setDraggable] = useState(false);
  const [action, setAction] = useState('');
  const [expands, setExpands] = useState([]);
  const [treeData, setTreeData] = useState();
  const [bakTreeData, setBakTreeData] = useState();

  useEffect(() => {
    if (!loading) store.fetchGroups()
  }, [loading])

  const menus = (
    <Menu onClick={() => setVisible(false)}>
      <Menu.Item key="0" icon={<FolderOutlined/>} onClick={handleAddRoot}>新建根分组</Menu.Item>
      <Menu.Item key="1" icon={<FolderAddOutlined/>} onClick={handleAdd}>新建子分组</Menu.Item>
      <Menu.Item key="2" icon={<EditOutlined/>} onClick={() => setAction('edit')}>重命名</Menu.Item>
      <Menu.Divider/>
      <Menu.Item key="3" icon={<CopyOutlined/>} onClick={() => store.showSelector(true)}>添加至分组</Menu.Item>
      <Menu.Item key="4" icon={<ScissorOutlined/>} onClick={() => store.showSelector(false)}>移动至分组</Menu.Item>
      <Menu.Divider/>
      <Menu.Item key="5" icon={<DeleteOutlined/>} danger onClick={handleRemove}>删除此分组</Menu.Item>
    </Menu>
  )

  function handleSubmit() {
    if (!store.group.title) {
      return message.error('请输入分组名称')
    }
    setLoading(true);
    const {key, parent_id, title} = store.group;
    http.post('/api/host/group/', {id: key || undefined, parent_id, name: title})
      .then(() => setAction(''))
      .finally(() => setLoading(false))
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
    setBakTreeData(lds.cloneDeep(treeData));
    const current = {key: 0, parent_id: 0, title: ''};
    treeData.unshift(current);
    setTreeData(lds.cloneDeep(treeData));
    store.group = current;
    setAction('edit')
  }

  function handleAdd() {
    setBakTreeData(lds.cloneDeep(treeData));
    const current = {key: 0, parent_id: store.group.key, title: ''};
    store.group.children.unshift(current);
    setTreeData(lds.cloneDeep(treeData));
    if (!expands.includes(store.group.key)) setExpands([store.group.key, ...expands]);
    store.group = current;
    setAction('edit')
  }

  function handleDrag(v) {
    setLoading(true);
    const pos = v.node.pos.split('-');
    const dropPosition = v.dropPosition - Number(pos[pos.length - 1]);
    http.patch('/api/host/group/', {s_id: v.dragNode.key, d_id: v.node.key, action: dropPosition})
      .then(() => setLoading(false))
  }

  function handleBlur() {
    if (store.group.key === 0) {
      setTreeData(bakTreeData)
    }
    setAction('')
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
        suffix={loading ? <LoadingOutlined/> : <span/>}
        onClick={e => e.stopPropagation()}
        onBlur={handleBlur}
        onChange={e => store.group.title = e.target.value}
        onPressEnter={handleSubmit}/>
    } else if (action === 'del' && nodeData.key === store.group.key) {
      return <LoadingOutlined style={{marginLeft: '4px'}}/>
    } else {
      return (
        <span style={{lineHeight: '24px'}}>
          {nodeData.title}{nodeData.all_host_ids && nodeData.all_host_ids.length ? `（${nodeData.all_host_ids.length}）` : null}
        </span>
      )
    }
  }

  return (
    <Card
      title="分组列表"
      loading={store.grpFetching}
      extra={<Switch checked={draggable} onChange={setDraggable} checkedChildren="拖拽" unCheckedChildren="浏览"/>}>
      <Dropdown
        overlay={menus}
        visible={visible}
        trigger={['contextMenu']}
        onVisibleChange={v => v || setVisible(v)}>
        <Tree.DirectoryTree
          className={styles.dragBox}
          autoExpandParent
          draggable={draggable}
          treeData={store.treeData}
          titleRender={treeRender}
          expandedKeys={expands}
          selectedKeys={[store.group.key]}
          onSelect={(_, {node}) => store.group = node}
          onExpand={handleExpand}
          onDrop={handleDrag}
          onRightClick={v => {
            store.group = v.node;
            setVisible(true)
          }}
        />
      </Dropdown>
    </Card>
  )
})
