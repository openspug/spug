import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react';
import { Modal, Row, Col, Tree, Table } from 'antd';
import store from './store';

export default observer(function (props) {
  const [loading, setLoading] = useState(false);
  const [group, setGroup] = useState({});
  const [dataSource, setDataSource] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  useEffect(() => {
    if (!store.treeData.length) {
      store.fetchRecords()
      store.fetchGroups()
        .then(() => setGroup(store.treeData[0]))
    } else {
      setGroup(store.treeData[0])
    }
  }, [])

  useEffect(() => {
    if (group.key) {
      const records = store.records.filter(x => group.self_host_ids.includes(x.id));
      setDataSource(records)
    }
  }, [group])

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
      setLoading(true)
      props.onOk(group, selectedRowKeys)
        .then(props.onCancel, () => setLoading(false))
    }
  }

  return (
    <Modal
      visible
      width="70%"
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
            onSelect={(_, {node}) => setGroup(node)}
          />
        </Col>
        <Col span={18}>
          <Table
            rowKey="id"
            dataSource={dataSource}
            onRow={record => {
              return {
                onClick: () => handleClickRow(record)
              }
            }}
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys)
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