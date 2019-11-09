import React from 'react';
import { observer } from 'mobx-react';
import { Table, Divider, Modal, Badge, message, Button } from 'antd';
import ComForm from './Form';
import http from 'libs/http';
import store from './store';

@observer
class ComTable extends React.Component {
  componentDidMount() {
    store.fetchRecords()
  }

  columns = [{
    title: '序号',
    key: 'series',
    render: (_, __, index) => index + 1
  }, {
    title: '登录名',
    dataIndex: 'username',
  }, {
    title: '姓名',
    dataIndex: 'nickname',
  }, {
    title: '状态',
    render: text => text['is_active'] ? <Badge status="success" text="正常"/> : <Badge status="default" text="禁用"/>
  }, {
    title: '最近登录',
    dataIndex: 'last_login'
  }, {
    title: '操作',
    render: info => (
      <span>
        <span className="span-button" onClick={() => this.handleActive(info)}>{info['is_active'] ? '禁用' : '启用'}</span>
        <Divider type="vertical"/>
        <span className="span-button" onClick={() => store.showForm(info)}>编辑</span>
        <Divider type="vertical"/>
        <span className="span-button" onClick={() => this.handleDelete(info)}>删除</span>
      </span>
    )
  }];

  handleActive = (text) => {
    Modal.confirm({
      title: '操作确认',
      content: `确定要${text['is_active'] ? '禁用' : '启用'}【${text['nickname']}】?`,
      onOk: () => {
        return http.patch(`/api/account/user/`, {id: text.id, is_active: !text['is_active']})
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
      content: `确定要删除【${text['nickname']}】?`,
      onOk: () => {
        return http.delete('/api/account/user/', {params: {id: text.id}})
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
      data = data.filter(item => item['username'].toLowerCase().includes(store.f_name.toLowerCase()))
    }
    if (store.f_status) {
      data = data.filter(item => String(item['is_active']) === store.f_status)
    }
    return (
      <React.Fragment>
        <Table rowKey="id" loading={store.isFetching} dataSource={data} columns={this.columns}/>
        {store.formVisible && <ComForm/>}
      </React.Fragment>
    )
  }
}

export default ComTable