/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { LockOutlined } from '@ant-design/icons';
import { Table, Modal, Tooltip, message } from 'antd';
import { Action } from 'components';
import ComForm from './Form';
import { http, hasPermission } from 'libs';
import store from './store';

@observer
class TableView extends React.Component {
  lockIcon = <Tooltip title="私有配置应用专用，不会被其他应用获取到">
    <LockOutlined style={{marginRight: 5}}/>
  </Tooltip>;

  columns = [{
    title: 'Key',
    key: 'key',
    render: info => {
      let prefix = (store.type === 'app' && info.is_public === false) ? this.lockIcon : null;
      let content = info.desc ? <span style={{color: '#1890ff'}}>{info.key}</span> : info.key;
      return <React.Fragment>
        {prefix}
        <Tooltip title={info.desc}>{content}</Tooltip>
      </React.Fragment>
    }
  }, {
    title: 'Value',
    dataIndex: 'value',
  }, {
    title: '修改人',
    width: 120,
    dataIndex: 'update_user'
  }, {
    title: '修改时间',
    width: 180,
    dataIndex: 'updated_at'
  }, {
    title: '操作',
    width: 120,
    className: hasPermission(`config.${store.type}.edit_config`) ? null : 'none',
    render: info => (
      <Action>
        <Action.Button auth={`config.${store.type}.edit_config`} onClick={() => store.showForm(info)}>编辑</Action.Button>
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
    if (store.f_name) {
      data = data.filter(item => item['key'].toLowerCase().includes(store.f_name.toLowerCase()))
    }
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
