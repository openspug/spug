import React from 'react'
import { observer } from 'mobx-react';
import { Dropdown } from 'antd';
import { MoreOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import Icon from './Icon';
import { clsNames } from 'libs';
import css from './node.module.less';
import S from './store';

function Node(props) {
  function handleNodeClick(e) {
    e.stopPropagation()
    S.node = props.node
  }

  function handleActionClick(e) {
    e.stopPropagation()
    S.actionNode = props.node
  }

  const menus = [
    {
      key: 'upstream',
      label: '添加上游节点',
      icon: <ArrowUpOutlined/>,
      onClick: props.onAction
    },
    {
      key: 'downstream',
      label: '添加下游节点',
      icon: <ArrowDownOutlined/>,
      onClick: props.onAction
    },
    {
      key: 'delete',
      danger: true,
      label: '删除此节点',
      icon: <DeleteOutlined/>,
      onClick: props.onAction
    }
  ]

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
        <React.Fragment>
          <div className={clsNames(css.box, css.node, S.node.id === node.id && css.active)}
               onMouseDown={handleNodeClick}>
            <Icon size={36} module={node.module}/>
            {node.name ? (
              <div className={css.title}>{node.name}</div>
            ) : (
              <div className={css.title} style={{color: '#595959'}}>请选择节点</div>
            )}
            <Dropdown className={css.action} trigger="click" menu={{items: menus}} onMouseDown={handleActionClick}>
              <MoreOutlined/>
            </Dropdown>
          </div>
          <div className={css.blank}/>
        </React.Fragment>
      )
  }
}

export default observer(Node)