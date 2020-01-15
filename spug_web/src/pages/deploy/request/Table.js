/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Table, Divider, Modal, Icon, Popover, Tag, message } from 'antd';
import http from 'libs/http';
import store from './store';
import { LinkButton, AuthLink } from "components";

@observer
class ComTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false
    }
  }

  componentDidMount() {
    store.fetchRecords()
  }

  columns = [{
    title: '申请标题',
    dataIndex: 'name',
  }, {
    title: '应用',
    dataIndex: 'app_name',
  }, {
    title: '发布环境',
    dataIndex: 'env_name',
  }, {
    title: '版本',
    render: info => {
      if (info['app_extend'] === '1') {
        const [type, ext1, ext2] = info.extra;
        if (type === 'branch') {
          return <React.Fragment>
            <Icon type="branches"/> {ext1}#{ext2.substr(0, 6)}
          </React.Fragment>
        } else {
          return <React.Fragment>
            <Icon type="tag"/> {ext1}
          </React.Fragment>
        }
      } else {
        return <React.Fragment>
          <Icon type="build"/> {info.extra[0]}
        </React.Fragment>
      }
    }
  }, {
    title: '状态',
    render: info => {
      if (info.status === '-1' && info.reason) {
        return <Popover title="驳回原因:" content={info.reason}>
          <span style={{color: '#1890ff'}}>{info['status_alias']}</span>
        </Popover>
      } else if (info.status === '1' && info.reason) {
        return <Popover title="审核意见:" content={info.reason}>
          <span style={{color: '#1890ff'}}>{info['status_alias']}</span>
        </Popover>
      } else if (info.status === '2') {
        return <Tag color="blue">{info['status_alias']}</Tag>
      } else if (info.status === '3') {
        return <Tag color="green">{info['status_alias']}</Tag>
      } else if (info.status === '-3') {
        return <Tag color="red">{info['status_alias']}</Tag>
      } else {
        return info['status_alias']
      }
    }
  }, {
    title: '申请人',
    dataIndex: 'created_by_user',
  }, {
    title: '申请时间',
    dataIndex: 'created_at'
  }, {
    title: '操作',
    render: info => {
      switch (info.status) {
        case '-3':
          return <React.Fragment>
            <AuthLink auth="deploy.request.do" to={`/deploy/do/ext${info['app_extend']}/${info.id}`}>发布</AuthLink>
            <Divider type="vertical"/>
            <LinkButton
              auth="deploy.request.do"
              disabled={info.type === '2'}
              loading={this.state.loading}
              onClick={() => this.handleRollback(info)}>回滚</LinkButton>
          </React.Fragment>;
        case '3':
          return <LinkButton
            auth="deploy.request.do"
            disabled={info.type === '2'}
            loading={this.state.loading}
            onClick={() => this.handleRollback(info)}>回滚</LinkButton>;
        case '-1':
          return <React.Fragment>
            <LinkButton auth="deploy.request.edit" onClick={() => store.showForm(info)}>编辑</LinkButton>
            <Divider type="vertical"/>
            <LinkButton auth="deploy.request.del" onClick={() => this.handleDelete(info)}>删除</LinkButton>
          </React.Fragment>;
        case '0':
          return <React.Fragment>
            <LinkButton auth="deploy.request.approve" onClick={() => store.showApprove(info)}>审核</LinkButton>
            <Divider type="vertical"/>
            <LinkButton auth="deploy.request.edit" onClick={() => store.showForm(info)}>编辑</LinkButton>
            <Divider type="vertical"/>
            <LinkButton auth="deploy.request.del" onClick={() => this.handleDelete(info)}>删除</LinkButton>
          </React.Fragment>;
        case '1':
          return <React.Fragment>
            <AuthLink auth="deploy.request.do" to={`/deploy/do/ext${info['app_extend']}/${info.id}`}>发布</AuthLink>
            <Divider type="vertical"/>
            <LinkButton auth="deploy.request.del" onClick={() => this.handleDelete(info)}>删除</LinkButton>
          </React.Fragment>;
        default:
          return null
      }
    }
  }];

  handleRollback = (info) => {
    this.setState({loading: true});
    http.put('/api/deploy/request/', {id: info.id, action: 'check'})
      .then(res => {
        Modal.confirm({
          title: '回滚确认',
          content: `确定要回滚至 ${res['date']} 创建的名称为【${res['name']}】的发布申请版本?`,
          onOk: () => {
            return http.put('/api/deploy/request/', {id: info.id, action: 'do'})
              .then(() => {
                message.success('回滚申请创建成功');
                store.fetchRecords()
              })
          }
        })
      })
      .finally(() => this.setState({loading: false}))
  };

  handleDelete = (info) => {
    Modal.confirm({
      title: '删除确认',
      content: `确定要删除【${info['name']}】?`,
      onOk: () => {
        return http.delete('/api/deploy/request/', {params: {id: info.id}})
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
    if (store.f_app_name) {
      data = data.filter(item => item['app_name'].toLowerCase().includes(store.f_app_name.toLowerCase()))
    }
    return (
      <Table rowKey="id" loading={store.isFetching} dataSource={data} columns={this.columns}/>
    )
  }
}

export default ComTable
