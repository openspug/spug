/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Table, Modal, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Action, TableCard, AuthButton } from 'components';
import { http, hasPermission, t } from 'libs';
import store from './store';

@observer
class ComTable extends React.Component {
  componentDidMount() {
    store.fetchRecords()
  }

  handleDelete = (text) => {
    Modal.confirm({
      title: t('删除确认'),
      content: t('确定要删除【{}】?', text['name']),
      onOk: () => {
        return http.delete('/api/alarm/contact/', {params: {id: text.id}})
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
        tKey="ac"
        rowKey="id"
        title={t('报警联系人')}
        loading={store.isFetching}
        dataSource={store.dataSource}
        onReload={store.fetchRecords}
        actions={[
          <AuthButton
            auth="alarm.contact.add"
            type="primary"
            icon={<PlusOutlined/>}
            onClick={() => store.showForm()}>{t('新建')}</AuthButton>
        ]}
        pagination={{
          showSizeChanger: true,
          showLessItems: true,
          showTotal: total => t('共 {} 条', total),
          pageSizeOptions: ['10', '20', '50', '100']
        }}>
        <Table.Column title={t('姓名')} dataIndex="name"/>
        <Table.Column title={t('手机号')} dataIndex="phone"/>
        <Table.Column ellipsis title={t('邮箱')} dataIndex="email"/>
        <Table.Column ellipsis hide title={t('钉钉')} dataIndex="ding"/>
        <Table.Column ellipsis hide title={t('微信')} dataIndex="wx_token"/>
        <Table.Column ellipsis hide title={t('企业微信')} dataIndex="qy_wx"/>
        <Table.Column ellipsis hide title={t('飞书')} dataIndex="feishu"/>
        {hasPermission('alarm.contact.edit|alarm.contact.del') && (
          <Table.Column title={t('操作')} render={info => (
            <Action>
              <Action.Button auth="alarm.contact.edit" onClick={() => store.showForm(info)}>{t('编辑')}</Action.Button>
              <Action.Button danger auth="alarm.contact.del" onClick={() => this.handleDelete(info)}>{t('删除')}</Action.Button>
            </Action>
          )}/>
        )}
      </TableCard>
    )
  }
}

export default ComTable
