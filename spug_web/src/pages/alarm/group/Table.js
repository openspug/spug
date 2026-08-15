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
import contactStore from '../contact/store';
import lds from 'lodash';

@observer
class ComTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      contactMap: {}
    }
  }

  componentDidMount() {
    store.fetchRecords();
    if (contactStore.records.length === 0) {
      contactStore.fetchRecords().then(this._handleContacts)
    } else {
      this._handleContacts()
    }
  }

  _handleContacts = () => {
    const tmp = {};
    for (let item of contactStore.records) {
      tmp[item.id] = item
    }
    this.setState({contactMap: tmp})
  };

  handleDelete = (text) => {
    Modal.confirm({
      title: t('删除确认'),
      content: t('确定要删除【{}】?', text['name']),
      onOk: () => {
        return http.delete('/api/alarm/group/', {params: {id: text.id}})
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
        tKey="ag"
        rowKey="id"
        title={t('报警联系组')}
        loading={store.isFetching}
        dataSource={store.dataSource}
        onReload={store.fetchRecords}
        actions={[
          <AuthButton
            auth="alarm.group.add"
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
        <Table.Column title={t('组名称')} dataIndex="name"/>
        <Table.Column ellipsis title={t('成员')} dataIndex="contacts"
                      render={value => value.map(x => lds.get(this.state.contactMap, `${x}.name`)).join(',')}/>
        <Table.Column ellipsis title={t('描述信息')} dataIndex="desc"/>
        {hasPermission('alarm.group.edit|alarm.group.del') && (
          <Table.Column title={t('操作')} render={info => (
            <Action>
              <Action.Button auth="alarm.group.edit" onClick={() => store.showForm(info)}>{t('编辑')}</Action.Button>
              <Action.Button danger auth="alarm.group.del" onClick={() => this.handleDelete(info)}>{t('删除')}</Action.Button>
            </Action>
          )}/>
        )}
      </TableCard>
    )
  }
}

export default ComTable
