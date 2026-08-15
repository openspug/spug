/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Table, Modal, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { http, hasPermission, t } from 'libs';
import { Action, TableCard, AuthButton } from "components";
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
        return http.delete('/api/exec/template/', {params: {id: text.id}})
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
        tKey="et"
        title={t('模板列表')}
        rowKey="id"
        loading={store.isFetching}
        dataSource={store.dataSource}
        onReload={store.fetchRecords}
        actions={[
          <AuthButton
            auth="exec.template.add"
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
        <Table.Column title={t('模版名称')} dataIndex="name"/>
        <Table.Column title={t('模版类型')} dataIndex="type"/>
        <Table.Column ellipsis title={t('模版内容')} dataIndex="body"/>
        <Table.Column ellipsis title={t('描述信息')} dataIndex="desc"/>
        {hasPermission('exec.template.edit|exec.template.del') && (
          <Table.Column title={t('操作')} render={info => (
            <Action>
              <Action.Button auth="exec.template.edit" onClick={() => store.showForm(info)}>{t('编辑')}</Action.Button>
              <Action.Button danger auth="exec.template.del" onClick={() => this.handleDelete(info)}>{t('删除')}</Action.Button>
            </Action>
          )}/>
        )}
      </TableCard>
    )
  }
}

export default ComTable
