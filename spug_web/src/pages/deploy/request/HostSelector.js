import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { Modal, Table, Button, Alert, Tag } from 'antd';
import hostStore from 'pages/host/store';

export default observer(function (props) {
  const [selectedRowKeys, setSelectedRowKeys] = useState(props.host_ids || []);

  useEffect(() => {
    hostStore.initial()
  }, [])

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
      const res = props.onOk(selectedRowKeys);
      if (res && res.then) {
        res.then(props.onCancel)
      } else {
        props.onCancel();
      }
    }
  }

  function DeployStatus(props) {
    switch (props.status) {
      case '0':
        return <Tag color="blue">待调度</Tag>
      case '1':
        return <Tag color="orange">发布中</Tag>
      case '2':
        return <Tag color="green">发布成功</Tag>
      case '3':
        return <Tag color="red">发布失败</Tag>
      default:
        return <Tag color="blue">待发布</Tag>
    }
  }

  return (
    <Modal
      visible
      width={800}
      title={props.title}
      onOk={handleSubmit}
      okButtonProps={{disabled: selectedRowKeys.length === 0}}
      onCancel={props.onCancel}>
      <Alert
        style={{marginBottom: 12}}
        message={<span>已选择 <b style={{color: '#2563fc', fontSize: 18}}>{selectedRowKeys.length}</b> 台主机</span>}
        action={<Button type="link" disabled={selectedRowKeys.length === 0}
                        onClick={() => setSelectedRowKeys([])}>取消选择</Button>}/>
      <Table
        rowKey="id"
        dataSource={hostStore.records.filter(x => props.app_host_ids.includes(x.id))}
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
        <Table.Column title="主机名称" dataIndex="name"/>
        <Table.Column title="连接地址" dataIndex="hostname"/>
        <Table.Column title="备注信息" dataIndex="desc"/>
        {props.deploy_status ? (
          <Table.Column title="发布状态" render={v => <DeployStatus status={props.deploy_status[v.id]}/>}/>
        ) : null}
      </Table>
    </Modal>
  )
})