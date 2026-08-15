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
import { http, hasPermission, history, t } from 'libs';
import store from './store';

@observer
class ComTable extends React.Component {
  componentDidMount() {
    store.fetchRecords()
  }

  handleDelete = (text) => {
    Modal.confirm({
      title: t('删除确认'),
      content: t('将会同步删除服务的配置信息，确定要删除服务【{}】? ', text['name']),
      onOk: () => {
        return http.delete('/api/config/service/', {params: {id: text.id}})
          .then(() => {
            message.success(t('删除成功'));
            store.fetchRecords()
          })
      }
    })
  };

  toConfig = (info) => {
    store.record = info;
    history.push(`/config/setting/src/${info.id}`)
  }

  render() {
    return (
      <TableCard
        tKey="cs"
        rowKey="id"
        title={t('服务列表')}
        loading={store.isFetching}
        dataSource={store.dataSource}
        onReload={store.fetchRecords}
        actions={[
          <AuthButton
            auth="config.src.add"
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
        <Table.Column title={t('服务名称')} dataIndex="name"/>
        <Table.Column title={t('标识符')} dataIndex="key"/>
        <Table.Column ellipsis title={t('备注信息')} dataIndex="desc"/>
        {hasPermission('config.src.edit|config.src.del|config.src.view_config') && (
          <Table.Column title={t('操作')} render={info => (
            <Action>
              <Action.Button auth="config.src.edit" onClick={() => store.showForm(info)}>{t('编辑')}</Action.Button>
              <Action.Button auth="config.src.view_config" onClick={() => this.toConfig(info)}>{t('配置')}</Action.Button>
              <Action.Button danger auth="config.src.del" onClick={() => this.handleDelete(info)}>{t('删除')}</Action.Button>
            </Action>
          )}/>
        )}
      </TableCard>
    )
  }
}

export default ComTable
