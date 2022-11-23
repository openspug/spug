/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { observer } from 'mobx-react';
import { Modal, Input, message, Badge, Button } from 'antd';
import http from 'libs/http';
import { TableCard } from 'components';
import store from './store';


export default observer(function () {
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  function handleImportSelect() {
    setLoading(true);
    let ldap_data = [];
    for (let item of store.dataSource) {
      if (selectedRowKeys.includes(item.id)) {
        ldap_data.push(item);
      }
    }
    handleSubmit(ldap_data);
  }

  function handleImportAll() {
    setLoading(true);
    handleSubmit(store.dataSource);
  }

  function handleSubmit(data) {
    if (data) {
      http.post('/api/setting/ldap_import/', 
      {'ldap_data': data, 'username': store.username, 'nickname': store.nickname})
      .then(() => {
        message.success('操作成功');
        store.importVisible = false;
      }, () => setLoading(false))
    }
  }

  function handleClickRow(record) {
    let tmp = new Set(selectedRowKeys)
    if (!tmp.delete(record.id)) {
      tmp.add(record.id)
    }
    setSelectedRowKeys([...tmp])
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

  let columns = [{
    title: '登录名',
    dataIndex: "cn",
  }, {
    title: '姓名',
    dataIndex: "sn",
  }, {
    title: '是否存在',
    render: text => text.is_exist ? <Badge status="success" text='是' /> : <Badge status="error" text='否' />,
  }
  ];
  

  return (
    <Modal
      visible
      width={700}
      maskClosable={false}
      title={'Ldap用户导入'}
      onCancel={() => store.importVisible = false}
      confirmLoading={loading}
      onOk={handleImportAll}
      footer={[
        <Button key="back" onClick={() => store.importVisible = false}>取消</Button>,
        <Button key="select" type="primary" loading={loading} onClick={handleImportSelect}>导入选中</Button>,
        <Button key="import" type="primary" loading={loading} onClick={handleImportAll}>导入全部</Button>,
      ]}>
      
      <TableCard
        tKey="sa"
        rowKey="id"
        title="LDAP用户列表"
        loading={store.isFetching}
        dataSource={store.dataSource}
        onReload={store.fetchLdapRecords}
        onRow={record => {
          return {
            onClick: () => handleClickRow(record)
          }
        }}
        actions={[
          <Input value={store.f_name}  onChange={e => store.f_name = e.target.value } placeholder="搜索LDAP用户" />,
        ]}
        pagination={{
          showSizeChanger: true,
          showLessItems: true,
          showTotal: total => `共 ${total} 条`,
          pageSizeOptions: ['10', '20', '50', '100']
        }} 
        rowSelection={{
          selectedRowKeys,
          onSelect: handleClickRow,
          onSelectAll: handleSelectAll
        }}
        columns={columns} /> 

    </Modal>
  )
})
