/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Button, message, TreeSelect } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import hostStore from 'pages/host/store';
import http from 'libs/http';
import store from './store';
import styles from './index.module.css';

export default observer(function () {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([...store.record.group_perms]);

  useEffect(() => {
    if (hostStore.treeData.length === 0) {
      hostStore.initial()
    }
  }, [])

  function handleSubmit() {
    setLoading(true);
    http.patch('/api/account/role/', {id: store.record.id, group_perms: groups})
      .then(res => {
        message.success('操作成功');
        store.hostPermVisible = false;
        store.fetchRecords()
      }, () => setLoading(false))
  }

  function handleChange(index, value) {
    const tmp = [...groups];
    if (index !== undefined) {
      if (value) {
        tmp[index] = value;
      } else {
        tmp.splice(index, 1)
      }
    } else {
      tmp.push(undefined)
    }
    setGroups(tmp)
  }

  return (
    <Modal
      visible
      width={400}
      maskClosable={false}
      title="主机权限设置"
      onCancel={() => store.hostPermVisible = false}
      confirmLoading={loading}
      onOk={handleSubmit}>
      <Form layout="vertical">
        <Form.Item label="授权访问主机组" tooltip="主机权限将全局影响属于该角色的用户能够看到的主机。">
          {groups.map((id, index) => (
            <div className={styles.groupItem} key={index}>
              <TreeSelect
                value={id}
                showSearch={false}
                treeNodeLabelProp="name"
                treeData={hostStore.treeData}
                onChange={value => handleChange(index, value)}
                placeholder="请选择分组"/>
              {groups.length > 1 && (
                <MinusCircleOutlined className={styles.delIcon} onClick={() => handleChange(index)}/>
              )}
            </div>
          ))}
        </Form.Item>
        <Form.Item>
          <Button type="dashed" style={{width: '100%'}} onClick={() => handleChange()}>
            <PlusOutlined/>添加授权主机组
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  )
})