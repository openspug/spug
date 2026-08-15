/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { observer } from 'mobx-react';
import { BranchesOutlined, BuildOutlined, TagOutlined, PlusOutlined, TagsOutlined } from '@ant-design/icons';
import { Radio, Modal, Popover, Tag, Tooltip, Button, Space, message } from 'antd';
import { http, hasPermission, t } from 'libs';
import { Action, AuthButton, TableCard } from 'components';
import HostSelector from './HostSelector';
import S from './index.module.less';
import store from './store';
import moment from 'moment';
import lds from 'lodash';

function ComTable() {
  const [request, setRequest] = useState()

  const columns = [{
    title: t('申请标题'),
    className: S.min180,
    render: info => (
      <div>
        {info.type === '2' && <Tooltip title={t('回滚发布')}><Tag color="#f50">R</Tag></Tooltip>}
        {info.type === '3' && <Tooltip title={t('Webhook触发')}><Tag color="#87d068">A</Tag></Tooltip>}
        {info.plan && <Tooltip title={t('定时发布（{}）', info.plan)}> <Tag color="#108ee9">P</Tag></Tooltip>}
        {info.name}
      </div>
    )
  }, {
    title: t('应用'),
    className: S.min120,
    dataIndex: 'app_name',
  }, {
    title: t('发布环境'),
    className: S.min120,
    dataIndex: 'env_name',
  }, {
    title: t('版本'),
    className: S.min155,
    render: info => {
      if (info['app_extend'] === '1') {
        const [ext1] = info.extra || info.rep_extra;
        switch (ext1) {
          case 'branch':
            return <div><BranchesOutlined/> {info.version}</div>
          case 'tag':
            return <div><TagOutlined/> {info.version}</div>
          default:
            return <div><TagsOutlined/> {info.version}</div>
        }
      } else {
        return (
          <div><BuildOutlined/> {info.version}</div>
        )
      }
    }
  }, {
    title: t('申请人'),
    className: S.min120,
    dataIndex: 'created_by_user',
    hide: true
  }, {
    title: t('申请时间'),
    className: S.min120,
    dataIndex: 'created_at',
    sorter: (a, b) => a['created_at'].localeCompare(b['created_at']),
    render: v => <Tooltip title={v}>{v ? moment(v).fromNow() : null}</Tooltip>,
    hide: true
  }, {
    title: t('审核人'),
    className: S.min120,
    dataIndex: 'approve_by_user',
    hide: true
  }, {
    title: t('审核时间'),
    className: S.min120,
    dataIndex: 'approve_at',
    render: v => <Tooltip title={v}>{v ? moment(v).fromNow() : null}</Tooltip>,
  }, {
    title: t('发布人'),
    className: S.min120,
    dataIndex: 'do_by_user',
    hide: true
  }, {
    title: t('发布时间'),
    className: S.min120,
    dataIndex: 'do_at',
    render: v => <Tooltip title={v}>{v ? moment(v).fromNow() : null}</Tooltip>,
    hide: true
  }, {
    title: t('备注'),
    className: S.min120,
    dataIndex: 'desc',
  }, {
    title: t('状态'),
    fixed: 'right',
    width: 120,
    render: info => {
      if (info.status === '-1' && info.reason) {
        return <Popover title={t('驳回原因:')} content={info.reason}>
          <Tag color="#f50">{info['status_alias']}</Tag>
        </Popover>
      } else if (info.status === '1' && info.reason) {
        return <Popover title={t('审核意见:')} content={info.reason}>
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
    title: t('操作'),
    fixed: 'right',
    width: 220,
    className: hasPermission('deploy.request.do|deploy.request.edit|deploy.request.approve|deploy.request.del') ? S.min180 : 'none',
    render: info => {
      switch (info.status) {
        case '-3':
          return <Action>
            <Action.Button auth="deploy.request.do" onClick={() => store.readConsole(info)}>{t('查看')}</Action.Button>
            <DoAction info={info}/>
            {info.visible_rollback && (
              <Action.Button auth="deploy.request.do" onClick={() => store.rollback(info)}>{t('回滚')}</Action.Button>
            )}
            <Action.Button danger auth="deploy.request.del" onClick={() => handleDelete(info)}>{t('删除')}</Action.Button>
          </Action>;
        case '3':
          return <Action>
            <Action.Button auth="deploy.request.do" onClick={() => store.readConsole(info)}>{t('查看')}</Action.Button>
            {info.visible_rollback && (
              <Action.Button auth="deploy.request.do" onClick={() => store.rollback(info)}>{t('回滚')}</Action.Button>
            )}
            <Action.Button danger auth="deploy.request.del" onClick={() => handleDelete(info)}>{t('删除')}</Action.Button>
          </Action>;
        case '4':
          return <Action>
            <Action.Button auth="deploy.request.do" onClick={() => store.readConsole(info)}>{t('查看')}</Action.Button>
            <DoAction info={info}/>
            {info.visible_rollback && (
              <Action.Button auth="deploy.request.do" onClick={() => store.rollback(info)}>{t('回滚')}</Action.Button>
            )}
            <Action.Button danger auth="deploy.request.del" onClick={() => handleDelete(info)}>{t('删除')}</Action.Button>
          </Action>;
        case '-1':
          return <Action>
            <Action.Button auth="deploy.request.edit" onClick={() => store.showForm(info)}>{t('编辑')}</Action.Button>
            <Action.Button danger auth="deploy.request.del" onClick={() => handleDelete(info)}>{t('删除')}</Action.Button>
          </Action>;
        case '0':
          return <Action>
            <Action.Button auth="deploy.request.approve" onClick={() => store.showApprove(info)}>{t('审核')}</Action.Button>
            <Action.Button auth="deploy.request.edit" onClick={() => store.showForm(info)}>{t('编辑')}</Action.Button>
            <Action.Button danger auth="deploy.request.del" onClick={() => handleDelete(info)}>{t('删除')}</Action.Button>
          </Action>;
        case '1':
          return <Action>
            <DoAction info={info}/>
            <Action.Button danger auth="deploy.request.del" onClick={() => handleDelete(info)}>{t('删除')}</Action.Button>
          </Action>;
        case '2':
          return <Action>
            <Action.Button auth="deploy.request.do" onClick={() => store.readConsole(info)}>{t('查看')}</Action.Button>
            <Action.Button danger auth="deploy.request.del" onClick={() => handleDelete(info)}>{t('删除')}</Action.Button>
          </Action>;
        default:
          return null
      }
    }
  }];

  function DoAction(props) {
    const {deploy_status} = props.info;
    return (
      <Popover trigger="click" zIndex={2} title={t('确认发布方式')} content={(
        <div>
          <div style={{color: '#999', fontSize: 12}}>{t('全量：发布所有主机（包含已成功的）。')}</div>
          <div style={{color: '#999', fontSize: 12}}>{t('补偿：仅发布上次发布失败的主机。')}</div>
          <div style={{color: '#999', fontSize: 12}}>{t('灰度：选择指定主机发布。')}</div>
          <Space style={{width: '100%', justifyContent: 'flex-end', marginTop: 16}}>
            <Button size="small" disabled={!lds.findKey(deploy_status, x => x !== '2')}
                    onClick={() => handleDeploy(props.info, 'fail')}>{t('补偿')}</Button>
            <Button ghost size="small" type="primary" onClick={() => setRequest(props.info)}>{t('灰度')}</Button>
            <Button size="small" type="primary" onClick={() => handleDeploy(props.info, 'all')}>{t('全量')}</Button>
          </Space>
        </div>
      )}>
        <Action.Button auth="deploy.request.do">{t('发布')}</Action.Button>
      </Popover>
    )
  }

  function handleDelete(info) {
    Modal.confirm({
      title: t('删除确认'),
      content: t('确定要删除发布申请【{}】?', info['name']),
      onOk: () => {
        return http.delete('/api/deploy/request/', {params: {id: info.id}})
          .then(() => {
            message.success(t('删除成功'));
            store.fetchRecords()
          })
      }
    })
  }

  function handleDeploy(info, mode) {
    if (request && mode.length === 0) {
      return message.error(t('请选择灰度发布的主机'))
    }
    info.mode = mode
    store.showConsole(info)
    if (request) setRequest()
  }

  return (
    <React.Fragment>
      <TableCard
        tKey="dr"
        rowKey={row => row.key || row.id}
        title={t('申请列表')}
        columns={columns}
        scroll={{x: 1500}}
        tableLayout="auto"
        loading={store.isFetching}
        dataSource={store.dataSource}
        onReload={store.fetchRecords}
        actions={[
          <AuthButton
            auth="deploy.request.add"
            type="primary"
            icon={<PlusOutlined/>}
            onClick={() => store.addVisible = true}>{t('新建申请')}</AuthButton>,
          <Radio.Group value={store.f_status} onChange={e => store.f_status = e.target.value}>
            <Radio.Button value="all">{t('全部({})', store.counter['all'] || 0)}</Radio.Button>
            <Radio.Button value="0">{t('待审核({})', store.counter['0'] || 0)}</Radio.Button>
            <Radio.Button value="1">{t('待发布({})', store.counter['1'] || 0)}</Radio.Button>
            <Radio.Button value="3">{t('发布成功({})', store.counter['3'] || 0)}</Radio.Button>
            <Radio.Button value="-3">{t('发布异常({})', store.counter['-3'] || 0)}</Radio.Button>
            <Radio.Button value="99">{t('其他({})', store.counter['99'] || 0)}</Radio.Button>
          </Radio.Group>
        ]}
        pagination={{
          showSizeChanger: true,
          showLessItems: true,
          showTotal: total => t('共 {} 条', total),
          pageSizeOptions: ['10', '20', '50', '100']
        }}/>

      {request ? (
        <HostSelector
          title={t('选择灰度发布的主机')}
          app_host_ids={request.host_ids}
          onCancel={() => setRequest()}
          deploy_status={request.deploy_status}
          onOk={ids => handleDeploy(request, ids)}/>
      ) : null}
    </React.Fragment>
  )
}

export default observer(ComTable)
