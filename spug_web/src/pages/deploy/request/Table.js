/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Table, Modal, Icon, Popover, Tag, message } from 'antd';
import { http, hasPermission } from 'libs';
import { Action } from "components";
import store from './store';

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
        return <Tag>{info['status_alias']}</Tag>
      }
    }
  }, {
    title: '申请人',
    dataIndex: 'created_by_user',
  }, {
    title: '申请时间',
    dataIndex: 'created_at',
    sorter: (a, b) => a['created_at'].localeCompare(b['created_at'])
  }, {
    title: '操作',
    className: hasPermission('deploy.request.do|deploy.request.edit|deploy.request.approve|deploy.request.del') ? null : 'none',
    render: info => {
      switch (info.status) {
        case '-3':
          return <Action>
            <Action.Link
              auth="deploy.request.do"
              to={`/deploy/do/ext${info['app_extend']}/${info.id}/1`}>查看</Action.Link>
            <Action.Link auth="deploy.request.do" to={`/deploy/do/ext${info['app_extend']}/${info.id}`}>发布</Action.Link>
            <Action.Button
              auth="deploy.request.do"
              disabled={info.type === '2'}
              loading={this.state.loading}
              onClick={() => this.handleRollback(info)}>回滚</Action.Button>
          </Action>;
        case '3':
          return <Action>
            <Action.Link
              auth="deploy.request.do"
              to={`/deploy/do/ext${info['app_extend']}/${info.id}/1`}>查看</Action.Link>
            <Action.Button
              auth="deploy.request.do"
              disabled={info.type === '2'}
              loading={this.state.loading}
              onClick={() => this.handleRollback(info)}>回滚</Action.Button>
          </Action>;
        case '-1':
          return <Action>
            <Action.Button auth="deploy.request.edit" onClick={() => store.showForm(info)}>编辑</Action.Button>
            <Action.Button auth="deploy.request.del" onClick={() => this.handleDelete(info)}>删除</Action.Button>
          </Action>;
        case '0':
          return <Action>
            <Action.Button auth="deploy.request.approve" onClick={() => store.showApprove(info)}>审核</Action.Button>
            <Action.Button auth="deploy.request.edit" onClick={() => store.showForm(info)}>编辑</Action.Button>
            <Action.Button auth="deploy.request.del" onClick={() => this.handleDelete(info)}>删除</Action.Button>
          </Action>;
        case '1':
          return <Action>
            <Action.Link auth="deploy.request.do" to={`/deploy/do/ext${info['app_extend']}/${info.id}`}>发布</Action.Link>
            <Action.Button auth="deploy.request.del" onClick={() => this.handleDelete(info)}>删除</Action.Button>
          </Action>;
        case '2':
          return <Action>
            <Action.Link
              auth="deploy.request.do"
              to={`/deploy/do/ext${info['app_extend']}/${info.id}/1`}>查看</Action.Link>
          </Action>;
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
    if (store.f_app_id) {
      data = data.filter(item => item['app_id'] === store.f_app_id)
    }
    if (store.f_env_id) {
      data = data.filter(item => item['env_id'] === store.f_env_id)
    }
    if (store.f_s_date) {
      data = data.filter(item => {
        const date = item['created_at'].substr(0, 10);
        return date >= store.f_s_date && date <= store.f_e_date
      })
    }
    if (store.f_status !== 'all') {
      if (store.f_status === '99') {
        data = data.filter(item => ['-1', '2'].includes(item['status']))
      } else {
        data = data.filter(item => item['status'] === store.f_status)
      }
    }
    return (
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
        }}
        columns={this.columns}/>
    )
  }
}

export default ComTable
