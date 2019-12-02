import React from 'react';
import { observer } from 'mobx-react';
import { Table, Divider, Modal, message } from 'antd';
import { LinkButton } from 'components';
import ComForm from './Form';
import http from 'libs/http';
import store from './store';
import hostStore from '../host/store';
import lds from 'lodash';

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
    if (hostStore.records.length === 0) {
      hostStore.fetchRecords().then(() => {
        const tmp = {};
        for (let item of hostStore.records) {
          tmp[item.id] = item
        }
        this.setState({hosts: tmp})
      })
    }
  }

  columns = [{
    title: '序号',
    key: 'series',
    render: (_, __, index) => index + 1,
    width: 80
  }, {
    title: '任务名称',
    dataIndex: 'name',
  }, {
    title: '类型',
    dataIndex: 'type_alias',
  }, {
    title: '地址',
    render: info => {
      if ('34'.includes(info.type)) {
        return lds.get(this.state.hosts, `${info.addr}.name`)
      } else {
        return info.addr
      }
    },
    ellipsis: true
  }, {
    title: '频率',
    dataIndex: 'rate',
    render: value => `${value}分钟`
  }, {
    title: '状态',
    dataIndex: 'xx'
  }, {
    title: '备注',
    dataIndex: 'desc',
    ellipsis: true
  }, {
    title: '操作',
    render: info => (
      <span>
        <LinkButton onClick={() => this.handleActive(info)}>{info['is_active'] ? '禁用' : '启用'}</LinkButton>
        <Divider type="vertical"/>
        <LinkButton onClick={() => store.showForm(info)}>编辑</LinkButton>
        <Divider type="vertical"/>
        <LinkButton onClick={() => this.handleDelete(info)}>删除</LinkButton>
      </span>
    ),
    width: 180
  }];

  handleActive = (text) => {
    Modal.confirm({
      title: '操作确认',
      content: `确定要${text['is_active'] ? '禁用' : '启用'}【${text['nickname']}】?`,
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