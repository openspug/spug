import { useRef, useState, useEffect } from 'react'
import { Card, Tree, Dropdown, Input, Spin } from 'antd'
import { FaServer } from 'react-icons/fa6'
import { IoMdMore } from 'react-icons/io'
import { AiOutlineFolder, AiOutlineFolderAdd, AiOutlineEdit, AiOutlineFileAdd, AiOutlineScissor, AiOutlineClose, AiOutlineDelete } from 'react-icons/ai'
import { useImmer } from 'use-immer'
import { http, findNodeByKey } from '@/libs'
import css from './index.module.scss'

let clickNode = null
let rawTreeData = []

function Group() {
  const inputRef = useRef(null)
  const [expandedKeys, setExpandedKeys] = useState([])
  const [treeData, updateTreeData] = useImmer([])
  const [loading, setLoading] = useState(false)

  const menuItems = [
    { label: '新建根分组', key: 'newRoot', icon: <AiOutlineFolder size={18} /> },
    { label: '新建子分组', key: 'newChild', icon: <AiOutlineFolderAdd size={18} /> },
    { label: '重命名', key: 'rename', icon: <AiOutlineEdit size={18} /> },
    { type: 'divider' },
    { label: '添加主机', key: 'addHost', icon: <AiOutlineFileAdd size={18} /> },
    { label: '移动主机', key: 'moveHost', icon: <AiOutlineScissor size={18} /> },
    { label: '删除主机', key: 'deleteHost', icon: <AiOutlineClose size={18} /> },
    { type: 'divider' },
    { label: '删除此分组', key: 'deleteGroup', danger: true, icon: <AiOutlineDelete size={18} /> },
  ]

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line
  }, [])

  function fetchData() {
    setLoading(true)
    http.get('/api/host/group/')
      .then(res => {
        rawTreeData = res.treeData
        updateTreeData(res.treeData)
      })
      .finally(() => setLoading(false))
  }

  function handleNodeClick(e, node) {
    e.stopPropagation()
    clickNode = node
  }

  function handleMenuClick({ key, domEvent }) {
    domEvent.stopPropagation()
    switch (key) {
      case 'newRoot':
        updateTreeData(draft => {
          draft.unshift({ key, action: key, selectable: false })
        })
        break
      case 'newChild':
        updateTreeData(draft => {
          const node = findNodeByKey(draft, clickNode.key)
          if (!node) return
          if (!node.children) node.children = []
          node.children.unshift({ key, action: key, selectable: false })
        })
        if (![expandedKeys].includes(clickNode.key)) {
          setExpandedKeys([...expandedKeys, clickNode.key])
        }
        break
      case 'rename':
        updateTreeData(draft => {
          const node = findNodeByKey(draft, clickNode.key)
          if (!node) return
          node.action = key
          node.selectable = false
        })
        break
      case 'addHost':
        console.log('添加主机')
        break
      case 'moveHost':
        console.log('移动主机')
        break
      case 'deleteHost':
        console.log('删除主机')
        break
      case 'deleteGroup':
        setLoading(true)
        http.delete('/api/host/group/', { id: clickNode.key })
          .then(() => fetchData(), () => setLoading(false))
        break
      default:
        break
    }
    if (['newRoot', 'newChild', 'rename'].includes(key)) {
      setTimeout(() => {
        inputRef.current.focus()
      }, 300)
    }
  }

  function handleInputSubmit(e, node) {
    const value = e.target.value.trim()
    if (value) {
      let form = { name: value }
      if (node.action === 'newChild') {
        form.parent_id = clickNode.key
      } else if (node.action === 'rename') {
        form.id = node.key
      }
      setLoading(true)
      http.post('/api/host/group/', form)
        .then(() => fetchData(), () => setLoading(false))
    } else {
      updateTreeData(rawTreeData)
    }
  }

  function titleRender(node) {
    return ['newRoot', 'newChild', 'rename'].includes(node.action) ? (
      <Input
        ref={inputRef}
        defaultValue={node.title}
        onPressEnter={e => handleInputSubmit(e, node)}
        onBlur={e => handleInputSubmit(e, node)}
        placeholder="请输入" />
    ) : (
      <div className={css.treeTitle}>
        <FaServer />
        <div className={css.title}>{node.title}</div>
        <div onClick={e => handleNodeClick(e, node)}>
          <Dropdown menu={{ items: menuItems, onClick: handleMenuClick }} trigger={['click']}>
            <div className={css.more}>
              <IoMdMore />
            </div>
          </Dropdown>
        </div>
      </div>
    )
  }

  return (
    <Card title="分组列表" className={css.group}>
      <Spin spinning={loading}>
        <Tree.DirectoryTree
          className={css.tree}
          defaultExpandParent
          showIcon={false}
          treeData={treeData}
          expandedKeys={expandedKeys}
          expandAction="doubleClick"
          titleRender={titleRender}
          onExpand={keys => setExpandedKeys(keys)}
        />
      </Spin>
    </Card>
  )
}

export default Group