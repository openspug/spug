import {useRef, useState} from 'react'
import {Card, Table, Flex, Divider} from 'antd'
import {IoExpand, IoContract, IoReloadOutline} from 'react-icons/io5'
import {clsNames} from '@/libs'
import Setting from './Setting.jsx'
import css from './index.module.scss'

function Stable(props) {
  const {skey, loading, columns, dataSource, actions, pagination} = props
  const ref = useRef();
  const [cols, setCols] = useState([])
  const [isFull, setIsFull] = useState(false)

  if (!skey) throw new Error('skey is required')

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

  return (
    <Card ref={ref} className={clsNames(css.stable, props.className)} style={props.style}>
      <Flex align="center" justify="flex-end" className={css.toolbar}>
        <Flex gap="middle" align="center">
          {actions}
          {actions.length ? <Divider type="vertical"/> : null}
          <IoReloadOutline className={css.icon} onClick={props.onReload}/>
          <Setting className={css.icon} skey={skey} columns={columns} setCols={setCols}/>
          {isFull ? (
            <IoContract className={css.icon} onClick={handleFullscreen}/>
          ) : (
            <IoExpand className={css.icon} onClick={handleFullscreen}/>
          )}
        </Flex>
      </Flex>
      <Table loading={loading} columns={cols} dataSource={dataSource} pagination={pagination}/>
    </Card>
  )
}

Stable.defaultProps = {
  sKey: null,
  loading: false,
  actions: [],
  defaultFields: [],
  pagination: {
    showSizeChanger: true,
    showLessItems: true,
    showTotal: total => t('page', {total}),
    pageSizeOptions: ['10', '20', '50', '100']
  },
  onReload: () => {
  },
}

export default Stable