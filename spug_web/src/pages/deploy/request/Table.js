/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { BranchesOutlined, BuildOutlined, TagOutlined, PlusOutlined } from '@ant-design/icons';
import { Radio, Modal, Popover, Tag, Popconfirm, message } from 'antd';
import { http, hasPermission } from 'libs';
import { Action, AuthButton, TableCard } from 'components';
import styles from './index.module.less';
import store from './store';

function ComTable() {
  const columns = [{
    title: '申请标题',
    render: info => (
      <div>
        {info.type === '2' && <Tag color="#f50">R</Tag>}
        {info.name}
      </div>
    )
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
        const [ext1] = info.rep_extra;
        return (
          <React.Fragment>
            {ext1 === 'branch' ? <BranchesOutlined/> : <TagOutlined/>} {info.version}
          </React.Fragment>
        )
      } else {
        return (
          <React.Fragment>
            <BuildOutlined/> {info.extra[0]}
          </React.Fragment>
        )
      }
    }
  }, {
    title: '状态',
    render: info => {
      if (info.status === '-1' && info.reason) {
        return <Popover title="驳回原因:" content={info.reason}>
          <Tag color="#f50">{info['status_alias']}</Tag>
        </Popover>
      } else if (info.status === '1' && info.reason) {
        return <Popover title="审核意见:" content={info.reason}>
          <Tag color="#87d068">{info['status_alias']}</Tag>
        </Popover>
      } else if (info.status === '2') {
        return <Tag color="orange">{info['status_alias']}</Tag>
      } else if (info.status === '3') {
        return <Tag color="green">{info['status_alias']}</Tag>
      } else if (info.status === '-3') {
        return <Tag color="red">{info['status_alias']}</Tag>
      } else {
        return <Tag color="blue">{info['status_alias']}</Tag>
      }
    }
  }, {
    title: '申请人',
    dataIndex: 'created_by_user',
    hide: true
  }, {
    title: '申请时间',
    dataIndex: 'created_at',
    sorter: (a, b) => a['created_at'].localeCompare(b['created_at']),
    hide: true
  }, {
    title: '备注',
    dataIndex: 'desc',
  }, {
    title: '操作',
    className: hasPermission('deploy.request.do|deploy.request.edit|deploy.request.approve|deploy.request.del') ? null : 'none',
    render: info => {
      switch (info.status) {
        case '-3':
          return <Action>
            <Action.Button auth="deploy.request.do" onClick={() => store.readConsole(info)}>查看</Action.Button>
            <Popconfirm title="确认要执行该发布申请？" onConfirm={e => handleDeploy(e, info)}>
              <Action.Button auth="deploy.request.do">发布</Action.Button>
            </Popconfirm>
            <Action.Button
              auth="deploy.request.do"
              disabled={info.type === '2'}
              onClick={() => store.rollback(info)}>回滚</Action.Button>
          </Action>;
        case '3':
          return <Action>
            <Action.Link
              auth="deploy.request.do"
              to={`/deploy/do/ext${info['app_extend']}/${info.id}/1`}>查看</Action.Link>
            <Action.Button
              auth="deploy.request.do"
              disabled={info.type === '2'}
              onClick={() => store.rollback(info)}>回滚</Action.Button>
          </Action>;
        case '-1':
          return <Action>
            <Action.Button auth="deploy.request.edit" onClick={() => store.showForm(info)}>编辑</Action.Button>
            <Action.Button auth="deploy.request.del" onClick={() => handleDelete(info)}>删除</Action.Button>
          </Action>;
        case '0':
          return <Action>
            <Action.Button auth="deploy.request.approve" onClick={() => store.showApprove(info)}>审核</Action.Button>
            <Action.Button auth="deploy.request.edit" onClick={() => store.showForm(info)}>编辑</Action.Button>
            <Action.Button auth="deploy.request.del" onClick={() => handleDelete(info)}>删除</Action.Button>
          </Action>;
        case '1':
          return <Action>
            <Action.Button auth="deploy.request.do" onClick={() => store.showConsole(info)}>发布</Action.Button>
            <Action.Button auth="deploy.request.del" onClick={() => handleDelete(info)}>删除</Action.Button>
          </Action>;
        case '2':
          return <Action>
            <Action.Button auth="deploy.request.do" onClick={() => store.readConsole(info)}>查看</Action.Button>
          </Action>;
        default:
          return null
      }
    }
  }];

  function handleRollback(info) {
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
  }

  function handleDelete(info) {
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
  }

  function handleDeploy(e, info) {
    const right = document.body.clientWidth - 25 - e.target.getBoundingClientRect().x;
    const bottom = document.body.clientHeight - 40 - e.target.getBoundingClientRect().y;
    store.box.setAttribute('style', `display: block; bottom: ${bottom}px; right: ${right}px;`);
    setTimeout(() => {
      store.box.setAttribute('class', `${styles.floatBox} ${styles.floatBoxAnimate}`)
    }, 10);
    setTimeout(() => {
      store.showConsole(info);
      store.box.setAttribute('style', 'display: none');
      store.box.setAttribute('class', styles.floatBox)
    }, 300)

  }

  return (
    <TableCard
      rowKey="id"
      title="申请列表"
      columns={columns}
      loading={store.isFetching}
      dataSource={store.dataSource}
      onReload={store.fetchRecords}
      actions={[
        <AuthButton
          auth="deploy.request.add"
          type="primary"
          icon={<PlusOutlined/>}
          onClick={() => store.addVisible = true}>新建申请</AuthButton>,
        <Radio.Group value={store.f_status} onChange={e => store.f_status = e.target.value}>
          <Radio.Button value="all">全部({store.counter['all'] || 0})</Radio.Button>
          <Radio.Button value="0">待审核({store.counter['0'] || 0})</Radio.Button>
          <Radio.Button value="1">待发布({store.counter['1'] || 0})</Radio.Button>
          <Radio.Button value="3">发布成功({store.counter['3'] || 0})</Radio.Button>
          <Radio.Button value="-3">发布异常({store.counter['-3'] || 0})</Radio.Button>
          <Radio.Button value="99">其他({store.counter['99'] || 0})</Radio.Button>
        </Radio.Group>
      ]}
      pagination={{
        showSizeChanger: true,
        showLessItems: true,
        hideOnSinglePage: true,
        showTotal: total => `共 ${total} 条`,
        pageSizeOptions: ['10', '20', '50', '100']
      }}/>
  )
}

export default observer(ComTable)
