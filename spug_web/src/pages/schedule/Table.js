/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { DownOutlined, PlusOutlined } from '@ant-design/icons';
import { Modal, Tag, Dropdown, Radio, message } from 'antd';
import { LinkButton, Action, TableCard, AuthButton } from 'components';
import { http, t } from 'libs';
import store from './store';

@observer
class ComTable extends React.Component {
  componentDidMount() {
    store.fetchRecords()
  }

  colors = ['orange', 'green', 'red', 'gold'];

  moreMenus = (info) => ({
    items: [
      {
        key: 'test',
        label: <LinkButton auth="schedule.schedule.edit" onClick={() => this.handleTest(info)}>{t('执行测试')}</LinkButton>
      },
      {
        key: 'active',
        label: (
          <LinkButton
            auth="schedule.schedule.edit"
            onClick={() => this.handleActive(info)}>
            {info.is_active ? t('禁用任务') : t('激活任务')}</LinkButton>
        )
      },
      {
        key: 'record',
        label: <LinkButton onClick={() => store.showRecord(info)}>{t('历史记录')}</LinkButton>
      },
      {type: 'divider'},
      {
        key: 'delete',
        label: <LinkButton danger auth="schedule.schedule.del" onClick={() => this.handleDelete(info)}>{t('删除')}</LinkButton>
      }
    ]
  });

  columns = [{
    title: t('任务名称'),
    dataIndex: 'name',
  }, {
    title: t('任务类型'),
    dataIndex: 'type',
  }, {
    title: t('触发方式'),
    dataIndex: 'trigger_alias'
  }, {
    title: t('最新状态'),
    render: info => {
      if (info.is_active) {
        if (info['latest_status_alias']) {
          return <Tag color={this.colors[info['latest_status']]}>{info['latest_status_alias']}</Tag>
        } else {
          return <Tag color="blue">{t('待调度')}</Tag>
        }
      } else {
        return <Tag>{t('未激活')}</Tag>
      }
    },
  }, {
    title: t('更新于'),
    dataIndex: 'latest_run_time_alias',
    sorter: (a, b) => a.latest_run_time.localeCompare(b.latest_run_time)
  }, {
    title: t('描述信息'),
    dataIndex: 'desc',
    ellipsis: true
  }, {
    title: t('操作'),
    width: 180,
    render: info => (
      <Action>
        <Action.Button disabled={info['latest_run_time'] === '1970-01-01'}
                       onClick={() => store.showInfo(info)}>{t('详情')}</Action.Button>
        <Action.Button auth="schedule.schedule.edit" onClick={() => store.showForm(info)}>{t('编辑')}</Action.Button>
        <Dropdown menu={this.moreMenus(info)} trigger={['click']}>
          <LinkButton>
            {t('更多')} <DownOutlined/>
          </LinkButton>
        </Dropdown>
      </Action>
    )
  }];

  handleActive = (text) => {
    Modal.confirm({
      title: t('操作确认'),
      content: text.is_active ? t('确定要禁用任务【{}】?', text['name']) : t('确定要激活任务【{}】?', text['name']),
      onOk: () => {
        return http.patch('/api/schedule/', {id: text.id, is_active: !text.is_active})
          .then(() => {
            message.success(t('操作成功'));
            store.fetchRecords()
          })
      }
    })
  };

  handleDelete = (text) => {
    Modal.confirm({
      title: t('删除确认'),
      content: t('确定要删除【{}】?', text['name']),
      onOk: () => {
        return http.delete('/api/schedule/', {params: {id: text.id}})
          .then(() => {
            message.success(t('删除成功'));
            store.fetchRecords()
          })
      }
    })
  };

  handleTest = (text) => {
    Modal.confirm({
      title: t('操作确认'),
      content: t('立即以串行模式执行该任务（不影响调度规则，且不会触发失败通知，测试执行会有120秒的超时，真实调度执行无此限制）？'),
      onOk: () => http.post(`/api/schedule/${text.id}/`, null, {timeout: 120000})
        .then(res => store.showInfo(text, res))
    })
  };

  render() {
    return (
      <TableCard
        tKey="si"
        rowKey="id"
        title={t('任务列表')}
        loading={store.isFetching}
        dataSource={store.dataSource}
        onReload={store.fetchRecords}
        actions={[
          <AuthButton
            auth="schedule.schedule.add"
            type="primary"
            icon={<PlusOutlined/>}
            onClick={() => store.showForm()}>{t('新建')}</AuthButton>,
          <Radio.Group value={store.f_active} onChange={e => store.f_active = e.target.value}>
            <Radio.Button value="">{t('全部')}</Radio.Button>
            <Radio.Button value="1">{t('已激活')}</Radio.Button>
            <Radio.Button value="0">{t('未激活')}</Radio.Button>
          </Radio.Group>
        ]}
        pagination={{
          showSizeChanger: true,
          showLessItems: true,
          showTotal: total => t('共 {} 条', total),
          pageSizeOptions: ['10', '20', '50', '100']
        }}
        columns={this.columns}/>
    )
  }
}

export default ComTable
