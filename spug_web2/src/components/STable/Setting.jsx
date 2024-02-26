import { useState, useEffect } from 'react'
import { Button, Checkbox, Flex, Popover } from 'antd'
import { IoSettingsOutline } from 'react-icons/io5'
import { app, clsNames } from '@/libs'


function Setting(props) {
  const { skey, columns, setCols } = props
  const [state, setState] = useState(app.getStable(skey))

  useEffect(() => {
    const newColumns = []
    for (const item of columns) {
      if (state[item.title] ?? !item.hidden) {
        newColumns.push(item)
      }
    }
    setCols(newColumns)
  }, [columns, state]);

  function handleChange(e) {
    const { value, checked } = e.target
    const newState = { ...state, [value]: checked }
    setState(newState)
    app.updateStable(skey, newState)
  }

  function handleReset() {
    setState({})
    app.updateStable(skey, null)
  }

  return (
    <Popover
      title={(
        <Flex justify="space-between" align="center">
          <div>{t('展示字段')}</div>
          <Button type="link" style={{ padding: 0 }} onClick={handleReset}>{t('重置')}</Button>
        </Flex>)}
      trigger="click"
      placement="bottomRight"
      content={(
        <Flex vertical gap="small">
          {columns.map((item, index) => (
            <Checkbox
              value={item.title}
              key={index}
              checked={state[item.title] ?? !item.hidden}
              onChange={handleChange}>
              {item.title}
            </Checkbox>
          ))}
        </Flex>
      )}>
      <div className={clsNames('anticon', props.className)}>
        <IoSettingsOutline />
      </div>
    </Popover>
  )
}

export default Setting
