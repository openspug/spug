/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Table, Space, Divider, Popover, Checkbox, Button, Input, Select } from 'antd';
import { ReloadOutlined, SettingOutlined, FullscreenOutlined, SearchOutlined } from '@ant-design/icons';
import styles from './index.module.less';

let TableFields = localStorage.getItem('TableFields')
TableFields = TableFields ? JSON.parse(TableFields) : {}

function Search(props) {
  let keys = props.keys || [''];
  keys = keys.map(x => x.split('/'));
  const [key, setKey] = useState(keys[0][0]);
  return (
    <Input
      allowClear
      style={{width: '280px'}}
      placeholder="输入检索"
      prefix={<SearchOutlined style={{color: '#c0c0c0'}}/>}
      onChange={e => props.onChange(key, e.target.value)}
      addonBefore={(
        <Select value={key} onChange={setKey}>
          {keys.map(item => (
            <Select.Option key={item[0]} value={item[0]}>{item[1]}</Select.Option>
          ))}
        </Select>
      )}/>
  )
}

function Footer(props) {
  const actions = props.actions || [];
  const length = props.selected.length;
  return length > 0 ? (
    <div className={styles.tableFooter}>
      <div className={styles.left}>已选择 <span>{length}</span> 项</div>
      <Space size="middle">
        {actions.map((item, index) => (
          <React.Fragment key={index}>{item}</React.Fragment>
        ))}
      </Space>
    </div>
  ) : null
}

function Header(props) {
  const columns = props.columns || [];
  const actions = props.actions || [];
  const fields = props.fields || [];
  const onFieldsChange = props.onFieldsChange;

  const Fields = () => {
    return (
      <Checkbox.Group value={fields} onChange={onFieldsChange}>
        {columns.map((item, index) => (
          <Checkbox value={index} key={index}>{item.title}</Checkbox>
        ))}
      </Checkbox.Group>
    )
  }

  function handleCheckAll(e) {
    if (e.target.checked) {
      onFieldsChange(columns.map((_, index) => index))
    } else {
      onFieldsChange([])
    }
  }

  function handleFullscreen() {
    if (props.rootRef.current && document.fullscreenEnabled) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        props.rootRef.current.requestFullscreen()
      }
    }
  }

  return (
    <div className={styles.toolbar}>
      <div className={styles.title}>{props.title}</div>
      <div className={styles.option}>
        <Space size="middle" style={{marginRight: 10}}>
          {actions.map((item, index) => (
            <React.Fragment key={index}>{item}</React.Fragment>
          ))}
        </Space>
        {actions.length ? <Divider type="vertical"/> : null}
        <Space className={styles.icons}>
          <ReloadOutlined onClick={props.onReload}/>
          <Popover
            arrowPointAtCenter
            destroyTooltipOnHide={{keepParent: false}}
            title={[
              <Checkbox
                key="1"
                checked={fields.length === columns.length}
                indeterminate={![0, columns.length].includes(fields.length)}
                onChange={handleCheckAll}>列展示</Checkbox>,
              <Button
                key="2"
                type="link"
                style={{padding: 0}}
                onClick={() => onFieldsChange(props.defaultFields)}>重置</Button>
            ]}
            overlayClassName={styles.tableFields}
            trigger="click"
            placement="bottomRight"
            content={<Fields/>}>
            <SettingOutlined/>
          </Popover>
          <FullscreenOutlined onClick={handleFullscreen}/>
        </Space>
      </div>
    </div>
  )
}

function TableCard(props) {
  const rootRef = useRef();
  const batchActions = props.batchActions || [];
  const selected = props.selected || [];
  const [fields, setFields] = useState([]);
  const [defaultFields, setDefaultFields] = useState([]);
  const [columns, setColumns] = useState([]);

  useEffect(() => {
    let [_columns, _fields] = [props.columns, []];
    if (props.children) {
      if (Array.isArray(props.children)) {
        _columns = props.children.filter(x => x.props).map(x => x.props)
      } else {
        _columns = [props.children.props]
      }
    }
    let hideFields = _columns.filter(x => x.hide).map(x => x.title)
    if (props.tKey) {
      if (TableFields[props.tKey]) {
        hideFields = TableFields[props.tKey]
      } else {
        TableFields[props.tKey] = hideFields
        localStorage.setItem('TableFields', JSON.stringify(TableFields))
      }
    }
    for (let [index, item] of _columns.entries()) {
      if (!hideFields.includes(item.title)) _fields.push(index)
    }
    setFields(_fields);
    setColumns(_columns);
    setDefaultFields(_fields);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleFieldsChange(fields) {
    setFields(fields)
    if (props.tKey) {
      TableFields[props.tKey] = columns.filter((_, index) => !fields.includes(index)).map(x => x.title)
      localStorage.setItem('TableFields', JSON.stringify(TableFields))
    }
  }

  return (
    <div ref={rootRef} className={styles.tableCard}>
      <Header
        title={props.title}
        columns={columns}
        actions={props.actions}
        fields={fields}
        rootRef={rootRef}
        defaultFields={defaultFields}
        onFieldsChange={handleFieldsChange}
        onReload={props.onReload}/>
      <Table
        tableLayout={props.tableLayout}
        scroll={props.scroll}
        rowKey={props.rowKey}
        loading={props.loading}
        columns={columns.filter((_, index) => fields.includes(index))}
        dataSource={props.dataSource}
        rowSelection={props.rowSelection}
        expandable={props.expandable}
        pagination={props.pagination}/>
      {selected.length ? <Footer selected={selected} actions={batchActions}/> : null}
    </div>
  )
}

TableCard.Search = Search;
export default TableCard