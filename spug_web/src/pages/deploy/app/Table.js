import React from 'react';
import { observer } from 'mobx-react';
import { Table, Divider, Modal, Tag, Icon, message } from 'antd';
import http from 'libs/http';
import store from './store';
import { LinkButton } from "components";
import envStore from 'pages/config/environment/store';
import lds from 'lodash';

@observer
class ComTable extends React.Component {
  componentDidMount() {
    store.fetchRecords();
    if (envStore.records.length === 0) {
      envStore.fetchRecords()
    }
  }

  columns = [{
    title: '序号',
    key: 'series',
    render: (_, __, index) => index + 1,
    width: 80,
  }, {
    title: '应用名称',
    dataIndex: 'name',
  }, {
    title: '模式',
    dataIndex: 'extend',
    render: value => value === '1' ? <Icon style={{fontSize: 20, color: '#1890ff'}} type="ordered-list"/> :
      <Icon style={{fontSize: 20, color: '#1890ff'}} type="build"/>
  }, {
    title: '发布环境',
    dataIndex: 'env_id',
    render: value => lds.get(envStore.idMap, `${value}.name`)
  }, {
    title: '发布审核',
    dataIndex: 'is_audit',
    render: value => value ? <Tag color="green">开启</Tag> : <Tag color="red">关闭</Tag>
  }, {
    title: '操作',
    render: info => (
      <span>
        <LinkButton onClick={() => store.showForm(info)}>编辑</LinkButton>
        <Divider type="vertical"/>
        <LinkButton onClick={() => this.handleDelete(info)}>删除</LinkButton>
      </span>
    )
  }];

  handleDelete = (text) => {
    Modal.confirm({
      title: '删除确认',
      content: `确定要删除【${text['name']}】?`,
      onOk: () => {
        return http.delete('/api/exec/template/', {params: {id: text.id}})
          .then(() => {
            message.success('删除成功');
            store.fetchRecords()
          })
      }
    })
  };

  render() {
    console.debug(JSON.stringify(envStore.idMap));
    let data = store.records;
    if (store.f_name) {
      data = data.filter(item => item['name'].toLowerCase().includes(store.f_name.toLowerCase()))
    }
    return (
      <Table rowKey="id" loading={store.isFetching} dataSource={data} columns={this.columns}/>
    )
  }
}

export default ComTable