import {} from 'react'
import {Card, Tree} from 'antd'
import css from './index.module.scss'


function Group() {
  const dataSource = [
    {
      title: 'parent 1-0',
      key: '0-0-0',
      children: [
        {
          title: 'leaf',
          key: '0-0-0-0',
        },
        {
          title: 'leaf',
          key: '0-0-0-1',
        },
        {
          title: 'leaf',
          key: '0-0-0-2',
        },
      ],
    },
    {
      title: 'parent 1-1',
      key: '0-0-1',
      children: [
        {
          title: 'leaf',
          key: '0-0-1-0',
        },
      ],
    },
    {
      title: 'parent 1-2',
      key: '0-0-2',
      children: [
        {
          title: 'leaf',
          key: '0-0-2-0',
        },
        {
          title: 'leaf',
          key: '0-0-2-1',
        },
      ],
    },
  ]

  return (
    <Card title="分组列表" className={css.group}>
      <Tree.DirectoryTree
        treeData={dataSource}
      />
    </Card>
  )
}

export default Group