import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import {Modal, Table, Button, Alert, Spin, Space} from 'antd';
import hostStore from 'pages/host/store';
import lds from 'lodash';

export default observer(function (props) {
  const [selectedRowKeys, setSelectedRowKeys] = useState(props.host_ids || []);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 增加异步逻辑，以修复页面在初次载入时主机列表弹框看不到主机信息的问题
    hostStore.initial().then(() => {
      // 异步执行完后，去除 loading 状态
      setIsLoading(false)
    })
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

  // 若主机列表数据未加载完成，则返回 loading 状态
  if (isLoading) {
    return (
        <Modal
            visible
            width={600}
            title='可选主机列表'
            onOk={handleSubmit}
            onCancel={props.onCancel}>
            <Space style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <Spin spinning={isLoading} tip="加载中......" size="large"></Spin>
            </Space>
        </Modal>
    )
  }

  return (
    <Modal
      visible
      width={600}
      title='可选主机列表'
      onOk={handleSubmit}
      onCancel={props.onCancel}>
      {selectedRowKeys.length > 0 && (
        <Alert
          style={{marginBottom: 12}}
          message={`已选择 ${selectedRowKeys.length} 台主机`}
          action={<Button type="link" onClick={() => setSelectedRowKeys([])}>取消选择</Button>}/>
      )}
      <Table
        rowKey="id"
        dataSource={props.app_host_ids.map(id => ({id}))}
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
        <Table.Column
          title="主机名称"
          dataIndex="id"
          render={id => lds.get(hostStore.idMap, `${id}.name`)}/>
        <Table.Column
          title="连接地址"
          dataIndex="id"
          render={id => lds.get(hostStore.idMap, `${id}.hostname`)}/>
      </Table>
    </Modal>
  )
})