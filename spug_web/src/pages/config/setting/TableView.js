/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Table, Divider, Modal, Tooltip, Icon, message } from 'antd';
import { LinkButton } from 'components';
import ComForm from './Form';
import http from 'libs/http';
import store from './store';

@observer
class TableView extends React.Component {
  lockIcon = <Tooltip title="私有配置应用专用，不会被其他应用获取到">
    <Icon style={{marginRight: 5}} type="lock"/>
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
    ellipsis: true
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
    render: info => (
      <span>
        <LinkButton auth={`config.${store.type}.edit_config`} onClick={() => store.showForm(info)}>编辑</LinkButton>
        <Divider type="vertical"/>
        <LinkButton auth={`config.${store.type}.edit_config`} onClick={() => this.handleDelete(info)}>删除</LinkButton>
      </span>
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
        <Table size="small" rowKey="id" loading={store.isFetching} dataSource={data} columns={this.columns}/>
        {store.formVisible && <ComForm/>}
      </React.Fragment>
    )
  }
}

export default TableView
