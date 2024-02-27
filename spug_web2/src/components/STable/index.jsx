import { useRef, useState, useEffect } from 'react'
import { Card, Table, Flex, Divider, Checkbox, Button, Input, Tag } from 'antd'
import { IoExpand, IoContract, IoReloadOutline } from 'react-icons/io5'
import { useImmer } from 'use-immer'
import { clsNames, includes } from '@/libs'
import Setting from './Setting.jsx'
import css from './index.module.scss'

function STable(props) {
  const { skey, loading, columns, dataSource, actions, pagination } = props
  const ref = useRef()
  const sMap = useRef({})
  const [sColumns, setSColumns] = useState([])
  const [cols, setCols] = useState([])
  const [isFull, setIsFull] = useState(false)
  const [filters, updateFilters] = useImmer({})

  if (!skey) throw new Error('skey is required')

  useEffect(() => {
    const newColumns = []
    for (const item of columns) {
      const key = item.dataIndex
      if (item.filterKey) {
        let inputRef = null
        item.onFilter = (value, record) => includes(record[key], value)
        item.filterDropdown = (x) => {
          sMap.current[key] = x
          return (
            <div style={{ padding: 8, width: 200 }}>
              <Input.Search
                allowClear
                enterButton
                placeholder="请输入"
                value={x.selectedKeys[0] ?? ''}
                ref={ref => inputRef = ref}
                onChange={e => x.setSelectedKeys(e.target.value ? [e.target.value] : [])}
                onSearch={v => handleSearch(key, v)}
              />
            </div>
          )
        }
        item.onFilterDropdownOpenChange = (visible) => {
          if (visible) {
            setTimeout(() => inputRef.focus(), 100)
          }
        }
      } else if (item.filterItems) {
        item.onFilter = (value, record) => record[key] === value
        item.filterDropdown = (x) => {
          sMap.current[key] = x
          return (
            <div className={css.filterItems}>
              <Checkbox.Group
                options={item.filterItems}
                value={x.selectedKeys}
                onChange={x.setSelectedKeys} />
              <Divider style={{ margin: '0' }} />
              <Flex justify="space-between" className={css.action}>
                <Button size="small" type="link" disabled={x.selectedKeys.length === 0} onClick={() => x.setSelectedKeys([])}>{t('重置')}</Button>
                <Button size="small" type="primary" onClick={() => handleSearch(key, x.selectedKeys)}>{t('确定')}</Button>
              </Flex>
            </div>
          )
        }
      }
      newColumns.push(item)
    }
    setSColumns(newColumns)
  }, [columns])

  function handleSearch(key, v) {
    const x = sMap.current[key]
    updateFilters(draft => {
      if (Array.isArray(v)) {
        v.length ? draft[key] = v : delete draft[key]
      } else {
        v ? draft[key] = v : delete draft[key]
      }
    })
    if (!v) x.setSelectedKeys([])
    x.confirm()
  }

  function handleFullscreen() {
    if (ref.current && document.fullscreenEnabled) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
        setIsFull(false)
      } else {
        ref.current.requestFullscreen()
        setIsFull(true)
      }
    }
  }

  function SearchItem(props) {
    const { cKey, value } = props
    const column = columns.find(item => item.dataIndex === cKey)

    return (
      <Tag closable bordered={false} color="blue" onClose={() => handleSearch(cKey, '')} className={css.search}>
        {column.title}: {Array.isArray(value) ? value.join(' | ') : value}
      </Tag>
    )
  }

  return (
    <Card ref={ref} className={clsNames(css.stable, props.className)} style={props.style}>
      <Flex align="center" justify="space-between" className={css.toolbar}>
        {Object.keys(filters).length ? (
          <Flex>
            {Object.entries(filters).map(([key, value]) => (
              <SearchItem key={key} cKey={key} value={value} />
            ))}
          </Flex>
        ) : (
          <div className={css.title}>{props.title}</div>
        )}
        <Flex gap="middle" align="center">
          {actions}
          {actions.length ? <Divider type="vertical" /> : null}
          <IoReloadOutline className={css.icon} onClick={props.onReload} />
          <Setting className={css.icon} skey={skey} columns={sColumns} setCols={setCols} />
          {isFull ? (
            <IoContract className={css.icon} onClick={handleFullscreen} />
          ) : (
            <IoExpand className={css.icon} onClick={handleFullscreen} />
          )}
        </Flex>
      </Flex>
      <Table loading={loading} columns={cols} dataSource={dataSource} pagination={pagination} />
    </Card>
  )
}

STable.defaultProps = {
  sKey: null,
  loading: false,
  actions: [],
  defaultFields: [],
  pagination: {
    showSizeChanger: true,
    showLessItems: true,
    showTotal: total => t('page', { total }),
    pageSizeOptions: ['10', '20', '50', '100']
  },
  onReload: () => {
  },
}

export default STable