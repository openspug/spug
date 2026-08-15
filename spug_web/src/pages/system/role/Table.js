/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Modal, Popover, Button, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { TableCard, AuthButton, Action } from 'components';
import RoleUsers from './RoleUsers';
import http from 'libs/http';
import { t } from 'libs';
import store from './store';
import uStore from '../account/store';
import styles from './index.module.css';

@observer
class ComTable extends React.Component {
  componentDidMount() {
    store.fetchRecords()
    if (uStore.records.length === 0) {
      uStore.fetchRecords()
    }
  }

  columns = [{
    title: t('角色名称'),
    dataIndex: 'name',
  }, {
    title: t('关联账户'),
    render: info => info.used ? (
      <Popover overlayClassName={styles.roleUser} content={<RoleUsers id={info.id}/>}>
        <Button type="link">{info.used}</Button>
      </Popover>
    ) : <Button type="link" disabled>{info.used}</Button>
  }, {
    title: t('备注信息'),
    dataIndex: 'desc',
    ellipsis: true
  }, {
    title: t('操作'),
    width: 400,
    render: info => (
      <Action>
        <Action.Button onClick={() => store.showForm(info)}>{t('编辑')}</Action.Button>
        <Action.Button onClick={() => store.showPagePerm(info)}>{t('功能权限')}</Action.Button>
        <Action.Button onClick={() => store.showDeployPerm(info)}>{t('发布权限')}</Action.Button>
        <Action.Button onClick={() => store.showHostPerm(info)}>{t('主机权限')}</Action.Button>
        <Action.Button danger onClick={() => this.handleDelete(info)}>{t('删除')}</Action.Button>
      </Action>
    )
  }];

  handleDelete = (text) => {
    Modal.confirm({
      title: t('删除确认'),
      content: t('确定要删除角色【{}】?', text['name']),
      onOk: () => {
        return http.delete('/api/account/role/', {params: {id: text.id}})
          .then(() => {
            message.success(t('删除成功'));
            store.fetchRecords()
          })
      }
    })
  };

  render() {
    return (
      <TableCard
        rowKey="id"
        title={t('角色列表')}
        loading={store.isFetching}
        dataSource={store.dataSource}
        onReload={store.fetchRecords}
        actions={[
          <AuthButton type="primary" icon={<PlusOutlined/>} onClick={() => store.showForm()}>{t('新建')}</AuthButton>
        ]}
        pagination={{
          showSizeChanger: true,
          showLessItems: true,
          showTotal: total => t('共 {} 条', total),
          pageSizeOptions: ['10', '20', '50', '100']
        }}
        columns={this.columns}/>
    )
  }
}

export default ComTable
