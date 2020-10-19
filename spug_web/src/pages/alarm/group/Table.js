/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Table, Modal, message } from 'antd';
import ComForm from './Form';
import { http, hasPermission } from 'libs';
import store from './store';
import contactStore from '../contact/store';
import { Action } from "components";
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
      title: '删除确认',
      content: `确定要删除【${text['name']}】?`,
      onOk: () => {
        return http.delete('/api/alarm/group/', {params: {id: text.id}})
          .then(() => {
            message.success('删除成功');
            store.fetchRecords()
          })
      }
    })
  };

  render() {
    let data = store.records;
    if (store.f_name) {
      data = data.filter(item => item['name'].toLowerCase().includes(store.f_name.toLowerCase()))
    }
    if (store.f_type) {
      data = data.filter(item => item['type'].toLowerCase().includes(store.f_type.toLowerCase()))
    }
    return (
      <React.Fragment>
        <Table
          rowKey="id"
          loading={store.isFetching}
          dataSource={data}
          pagination={{
            showSizeChanger: true,
            showLessItems: true,
            hideOnSinglePage: true,
            showTotal: total => `共 ${total} 条`,
            pageSizeOptions: ['10', '20', '50', '100']
          }}>
          <Table.Column title="序号" key="series" render={(_, __, index) => index + 1}/>
          <Table.Column title="组名称" dataIndex="name"/>
          <Table.Column ellipsis title="成员" dataIndex="contacts"
                        render={value => value.map(x => lds.get(this.state.contactMap, `${x}.name`)).join(',')}/>
          <Table.Column ellipsis title="描述信息" dataIndex="desc"/>
          {hasPermission('alarm.group.edit|alarm.group.del') && (
            <Table.Column title="操作" render={info => (
              <Action>
                <Action.Button auth="alarm.group.edit" onClick={() => store.showForm(info)}>编辑</Action.Button>
                <Action.Button auth="alarm.group.del" onClick={() => this.handleDelete(info)}>删除</Action.Button>
              </Action>
            )}/>
          )}
        </Table>
        {store.formVisible && <ComForm/>}
      </React.Fragment>
    )
  }
}

export default ComTable
