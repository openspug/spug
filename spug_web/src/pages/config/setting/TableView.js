/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Table, Modal, Tooltip, message } from 'antd';
import { Action } from 'components';
import ComForm from './Form';
import { http, hasPermission, includes } from 'libs';
import store from './store';
import styles from './index.module.less';

@observer
class TableView extends React.Component {
  columns = [{
    title: 'Key',
    key: 'key',
    render: info => {
      const value = `_SPUG_${store.obj.key}_${info.key}`.toUpperCase()
      return info.desc ? (
        <Tooltip title={info.desc}>
          <span style={{color: '#2563fc'}}>{value}</span>
        </Tooltip>
      ) : value
    }
  }, {
    title: 'Value',
    dataIndex: 'value',
    className: styles.value
  }, {
    title: '操作人',
    width: 120,
    dataIndex: 'update_user'
  }, {
    title: '操作时间',
    width: 180,
    dataIndex: 'updated_at'
  }, {
    title: '操作',
    width: 120,
    className: hasPermission(`config.${store.type}.edit_config`) ? null : 'none',
    render: info => (
      <Action>
        <Action.Button auth={`config.${store.type}.edit_config`}
                       onClick={() => store.showForm(info)}>编辑</Action.Button>
        <Action.Button
          danger
          auth={`config.${store.type}.edit_config`}
          onClick={() => this.handleDelete(info)}>删除</Action.Button>
      </Action>
    )
  }];

  handleDelete = (text) => {
    Modal.confirm({
      title: '删除确认',
      content: `确定要删除【${store.env.name}】环境下的配置【${text['key']}】?`,
      onOk: () => {
        return http.delete('/api/config/', {params: {id: text.id}})
          .then(() => {
            message.success('删除成功');
            store.fetchRecords()
          })
      }
    })
  };

  render() {
    let data = store.records;
    if (store.f_name) data = data.filter(x => includes(x.key, store.f_name))
    return (
      <React.Fragment>
        <Table
          size="small"
          rowKey="id"
          loading={store.isFetching}
          dataSource={data}
          pagination={{
            showSizeChanger: true,
            showLessItems: true,
            hideOnSinglePage: true,
            showTotal: total => `共 ${total} 条`,
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          columns={this.columns}/>
        {store.formVisible && <ComForm/>}
      </React.Fragment>
    )
  }
}

export default TableView
