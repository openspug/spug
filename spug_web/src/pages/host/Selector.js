import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react';
import { Modal, Row, Col, Tree, Table, Button, Alert } from 'antd';
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
          {selectedRowKeys.length > 0 && (
            <Alert
              style={{marginBottom: 12}}
              message={`已选择 ${selectedRowKeys.length} 个主机`}
              action={<Button type="link" onClick={() => setSelectedRowKeys([])}>取消选择</Button>}/>
          )}
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