/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react';
import { Modal, Row, Col, Tree, Table, Button, Space, Input, Alert } from 'antd';
import { FolderOpenOutlined, FolderOutlined, PlusOutlined } from '@ant-design/icons';
import IPAddress from './IPAddress';
import hStore from './store';
import store from './store2';
import styles from './selector.module.less';

function HostSelector(props) {
  const [visible, setVisible] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [expands, setExpands] = useState([]);

  useEffect(() => {
    store.onlySelf = props.onlySelf;
    hStore.initial().then(() => {
      store.rawRecords = hStore.rawRecords;
      store.rawTreeData = hStore.rawTreeData;
      store.group = store.treeData[0] || {}
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  useEffect(() => {
    setSelectedRowKeys([...props.value])
  }, [props.value])

  useEffect(() => {
    if (props.onlySelf) {
      setSelectedRowKeys([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.group])

  function handleClickRow(record) {
    let tmp = new Set(selectedRowKeys)
    if (!tmp.delete(record.id)) {
      if (props.onlyOne) tmp.clear()
      tmp.add(record.id)
    }
    setSelectedRowKeys([...tmp])
  }

  function handleSubmit() {
    if (props.mode === 'ids') {
      props.onChange(props.onlyOne ? selectedRowKeys[0] : selectedRowKeys)
      handleClose()
    } else if (props.mode === 'rows') {
      const value = store.rawRecords.filter(x => selectedRowKeys.includes(x.id))
      props.onChange(props.onlyOne ? value[0] : value)
      handleClose()
    } else if (props.mode === 'group') {
      setLoading(true)
      props.onChange(store.group, selectedRowKeys)
        .then(handleClose, () => setLoading(false))
    }
  }

  function handleExpand(keys, {_, node}) {
    if (node.children.length > 0) {
      setExpands(keys)
    }
  }

  function handleSelectAll(selected) {
    let tmp = new Set(selectedRowKeys)
    for (let item of store.dataSource) {
      if (selected) {
        tmp.add(item.id)
      } else {
        tmp.delete(item.id)
      }
    }
    setSelectedRowKeys([...tmp])
  }

  function treeRender(nodeData) {
    const length = store.counter[nodeData.key]?.size
    return (
      <div className={styles.treeNode}>
        {expands.includes(nodeData.key) ? <FolderOpenOutlined/> : <FolderOutlined/>}
        <div className={styles.title}>{nodeData.title}</div>
        {length ? <div className={styles.number}>{length}</div> : null}
      </div>
    )
  }

  function handleClose() {
    setSelectedRowKeys([])
    setLoading(false)
    setVisible(false)
    if (props.onCancel) {
      props.onCancel()
    }
  }

  return (
    <div className={styles.selector}>
      {props.mode !== 'group' && (
        props.children ? (
          <div onClick={() => setVisible(true)}>{props.children}</div>
        ) : (
          props.type === 'button' ? (
            props.value.length > 0 ? (
              <Alert
                type="info"
                className={styles.area}
                message={<div>已选择 <b style={{fontSize: 18, color: '#1890ff'}}>{props.value.length}</b> 台主机</div>}
                onClick={() => setVisible(true)}/>
            ) : (
              <Button icon={<PlusOutlined/>} onClick={() => setVisible(true)}>
                添加目标主机
              </Button>
            )) : (
            <div style={{display: 'flex', alignItems: 'center'}}>
              {props.value.length > 0 && <span style={{marginRight: 16}}>已选择 {props.value.length} 台</span>}
              <Button type="link" style={{padding: 0}} onClick={() => setVisible(true)}>选择主机</Button>
            </div>
          )
        )
      )}

      <Modal
        visible={props.mode === 'group' || visible}
        width={1000}
        className={styles.modal}
        title={props.title || '主机列表'}
        onOk={handleSubmit}
        okButtonProps={{disabled: selectedRowKeys.length === 0 && !props.nullable}}
        confirmLoading={loading}
        onCancel={handleClose}>
        <Row>
          <Col span={6} style={{borderRight: '8px solid #f0f0f0', paddingRight: 12}}>
            <div className={styles.gTitle}>分组列表</div>
            <Tree.DirectoryTree
              showIcon={false}
              autoExpandParent
              expandAction="doubleClick"
              selectedKeys={[store.group.key]}
              expandedKeys={expands}
              treeData={store.treeData}
              titleRender={treeRender}
              onExpand={handleExpand}
              onSelect={(_, {node}) => store.group = node}
            />
          </Col>
          <Col span={18} style={{paddingLeft: 12}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 12}}>
              <Input allowClear style={{width: 260}} placeholder="输入名称/IP检索" value={store.f_word}
                     onChange={e => store.f_word = e.target.value}/>
              <Space hidden={selectedRowKeys.length === 0}>
                <div>已选择 {selectedRowKeys.length} 台主机</div>
                <Button type="link" style={{paddingRight: 0}} onClick={() => setSelectedRowKeys([])}>取消选择</Button>
              </Space>
            </div>
            <Table
              rowKey="id"
              dataSource={store.dataSource}
              pagination={false}
              scroll={{y: 480}}
              onRow={record => {
                return {
                  onClick: () => handleClickRow(record)
                }
              }}
              rowSelection={{
                selectedRowKeys,
                hideSelectAll: props.onlyOne,
                onSelect: handleClickRow,
                onSelectAll: handleSelectAll
              }}>
              <Table.Column ellipsis width={170} title="主机名称" dataIndex="name"/>
              <Table.Column width={320} title="IP地址" render={info => (
                <Space>
                  <IPAddress ip={info.public_ip_address} isPublic/>
                  <IPAddress ip={info.private_ip_address}/>
                </Space>
              )}/>
              <Table.Column title="备注信息" dataIndex="desc"/>
            </Table>
          </Col>
        </Row>
      </Modal>
    </div>
  )
}

HostSelector.defaultProps = {
  value: [],
  type: 'text',
  mode: 'ids',
  onlyOne: false,
  nullable: false,
  onChange: () => null
}

export default observer(HostSelector)