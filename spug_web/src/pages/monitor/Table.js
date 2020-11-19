/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Table, Modal, Tag, message } from 'antd';
import { Action } from 'components';
import ComForm from './Form';
import { http, hasPermission } from 'libs';
import store from './store';
import hostStore from '../host/store';
import lds from 'lodash';
import groupStore from "pages/alarm/group/store";

@observer
class ComTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hosts: {}
    }
  }

  componentDidMount() {
    store.fetchRecords();
    if (groupStore.records.length === 0) groupStore.fetchRecords();
    if (hostStore.records.length === 0) {
      hostStore.fetchRecords().then(this._handleHosts)
    } else {
      this._handleHosts()
    }
  }

  _handleHosts = () => {
    const tmp = {};
    for (let item of hostStore.records) {
      tmp[item.id] = item
    }
    this.setState({hosts: tmp})
  };

  handleActive = (text) => {
    Modal.confirm({
      title: '操作确认',
      content: `确定要${text['is_active'] ? '禁用' : '启用'}【${text['name']}】?`,
      onOk: () => {
        return http.patch(`/api/monitor/`, {id: text.id, is_active: !text['is_active']})
          .then(() => {
            message.success('操作成功');
            store.fetchRecords()
          })
      }
    })
  };

  handleDelete = (text) => {
    Modal.confirm({
      title: '删除确认',
      content: `确定要删除【${text['name']}】?`,
      onOk: () => {
        return http.delete('/api/monitor/', {params: {id: text.id}})
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
      data = data.filter(item => item['type_alias'] === store.f_type)
    }
    if (store.f_status !== undefined) {
      if (store.f_status === -3) {
        data = data.filter(item => !item['is_active'])
      } else if (store.f_status === -2) {
        data = data.filter(item => item['is_active'])
      } else if (store.f_status === -1) {
        data = data.filter(item => item['is_active'] && !item['latest_status_alias'])
      } else {
        data = data.filter(item => item['latest_status'] === store.f_status)
      }
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
          <Table.Column title="任务名称" dataIndex="name"/>
          <Table.Column title="类型" dataIndex="type_alias"/>
          <Table.Column ellipsis title="地址" render={info => {
            if ('34'.includes(info.type)) {
              return lds.get(this.state.hosts, `${info.addr}.name`)
            } else {
              return info.addr
            }
          }}/>
          <Table.Column title="频率" dataIndex="rate" render={value => `${value}分钟`}/>
          <Table.Column title="状态" render={info => {
            if (info.is_active) {
              if (info['latest_status'] === 0) {
                return <Tag color="green">正常</Tag>
              } else if (info['latest_status'] === 1) {
                return <Tag color="red">异常</Tag>
              } else {
                return <Tag color="orange">待检测</Tag>
              }
            } else {
              return <Tag>未启用</Tag>
            }
          }}/>
          <Table.Column title="更新于" dataIndex="latest_run_time_alias"
                        sorter={(a, b) => a.latest_run_time.localeCompare(b.latest_run_time)}/>
          {hasPermission('monitor.monitor.edit|monitor.monitor.del') && (
            <Table.Column width={180} title="操作" render={info => (
              <Action>
                <Action.Button auth="monitor.monitor.edit"
                               onClick={() => this.handleActive(info)}>{info['is_active'] ? '禁用' : '启用'}</Action.Button>
                <Action.Button auth="monitor.monitor.edit" onClick={() => store.showForm(info)}>编辑</Action.Button>
                <Action.Button auth="monitor.monitor.del" onClick={() => this.handleDelete(info)}>删除</Action.Button>
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
