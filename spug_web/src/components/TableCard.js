/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Table, Space, Divider, Popover, Checkbox, Button } from 'antd';
import { ReloadOutlined, SettingOutlined, FullscreenOutlined } from '@ant-design/icons';
import styles from './index.module.less';

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
        <Space size="middle">
          {actions.map((item, index) => (
            <React.Fragment key={index}>{item}</React.Fragment>
          ))}
        </Space>
        {actions.length ? <Divider type="vertical"/> : null}
        <Space>
          <ReloadOutlined onClick={props.onReload}/>
          <Popover
            arrowPointAtCenter
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
    for (let [index, item] of _columns.entries()) {
      if (!item.hide) _fields.push(index)
    }
    setFields(_fields);
    setColumns(_columns);
    setDefaultFields(_fields);
  }, [props.columns, props.children])

  return (
    <div ref={rootRef} className={styles.tableCard}>
      <Header
        title={props.title}
        columns={columns}
        actions={props.actions}
        fields={fields}
        rootRef={rootRef}
        defaultFields={defaultFields}
        onFieldsChange={setFields}
        onReload={props.onReload}/>
      <Table
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

export default TableCard