/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react';
import { Modal, Row, Col, Tree, Table, Button, Space, Input } from 'antd';
import { includes } from 'libs';
import store from './store';
import styles from './index.module.less';

export default observer(function (props) {
  const [loading, setLoading] = useState(false);
  const [group, setGroup] = useState({});
  const [dataSource, setDataSource] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [fKey, setFKey] = useState();

  useEffect(() => {
    if (!store.treeData.length) {
      store.initial()
        .then(() => setGroup(store.treeData[0] || {}))
    } else {
      setGroup(store.treeData[0] || {})
    }
  }, [])

  useEffect(() => {
    setSelectedRowKeys(props.selectedRowKeys || [])
  }, [props.selectedRowKeys])

  useEffect(() => {
    let records = store.records;
    if (group.key) records = records.filter(x => group.self_host_ids.includes(x.id));
    if (fKey) records = records.filter(x => includes(x.name, fKey) || includes(x.hostname, fKey));
    setDataSource(records)
  }, [group, fKey])

  function treeRender(nodeData) {
    return (
      <span style={{lineHeight: '24px'}}>
        {nodeData.title}{nodeData.self_host_ids && nodeData.self_host_ids.length ? `（${nodeData.self_host_ids.length}）` : null}
      </span>
    )
  }

  function handleClickRow(record) {
    const index = selectedRowKeys.indexOf(record.id);
    if (index !== -1) {
      selectedRowKeys.splice(index, 1)
    } else {
      selectedRowKeys.push(record.id)
    }
    setSelectedRowKeys([...selectedRowKeys])
  }

  function handleSubmit() {
    if (props.onOk) {
      setLoading(true);
      const res = props.onOk(group, selectedRowKeys);
      if (res && res.then) {
        res.then(props.onCancel, () => setLoading(false))
      } else {
        props.onCancel();
        setLoading(false)
      }
    }
  }

  function handleChangeGrp(node) {
    setGroup(node);
    if (props.oneGroup) setSelectedRowKeys([])
  }

  return (
    <Modal
      visible={[undefined, true].includes(props.visible)}
      width={1000}
      className={styles.selector}
      title={props.title || '主机列表'}
      onOk={handleSubmit}
      confirmLoading={loading}
      onCancel={props.onCancel}>
      <Row gutter={12}>
        <Col span={6}>
          <Tree.DirectoryTree
            selectedKeys={[group.key]}
            treeData={store.treeData}
            titleRender={treeRender}
            onSelect={(_, {node}) => handleChangeGrp(node)}
          />
        </Col>
        <Col span={18}>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 12}}>
            <Input allowClear style={{width: 260}} placeholder="输入检索" onChange={e => setFKey(e.target.value)}/>
            <Space hidden={selectedRowKeys.length === 0}>
              <div>已选择 {selectedRowKeys.length} 台主机</div>
              <Button type="link" onClick={() => setSelectedRowKeys([])}>取消选择</Button>
            </Space>
          </div>
          <Table
            rowKey="id"
            dataSource={dataSource}
            pagination={false}
            scroll={{y: 480}}
            onRow={record => {
              return {
                onClick: () => handleClickRow(record)
              }
            }}
            rowSelection={{
              selectedRowKeys,
              onSelect: handleClickRow,
              onSelectAll: (_, __, changeRows) => changeRows.map(x => handleClickRow(x))
            }}>
            <Table.Column title="主机名称" dataIndex="name" sorter={(a, b) => a.name.localeCompare(b.name)}/>
            <Table.Column title="连接地址" dataIndex="hostname" sorter={(a, b) => a.name.localeCompare(b.name)}/>
            <Table.Column hide ellipsis title="备注信息" dataIndex="desc"/>
          </Table>
        </Col>
      </Row>
    </Modal>
  )
})