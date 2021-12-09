/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { DownOutlined, PlusOutlined } from '@ant-design/icons';
import { Modal, Tag, Dropdown, Menu, Radio, message } from 'antd';
import { LinkButton, Action, TableCard, AuthButton } from 'components';
import { http } from 'libs';
import store from './store';

@observer
class ComTable extends React.Component {
  componentDidMount() {
    store.fetchRecords()
  }

  colors = ['orange', 'green', 'red'];

  moreMenus = (info) => (
    <Menu>
      <Menu.Item>
        <LinkButton auth="schedule.schedule.edit" onClick={() => this.handleTest(info)}>执行测试</LinkButton>
      </Menu.Item>
      <Menu.Item>
        <LinkButton
          auth="schedule.schedule.edit"
          onClick={() => this.handleActive(info)}>
          {info.is_active ? '禁用任务' : '激活任务'}</LinkButton>
      </Menu.Item>
      <Menu.Item>
        <LinkButton onClick={() => store.showRecord(info)}>历史记录</LinkButton>
      </Menu.Item>
      <Menu.Divider/>
      <Menu.Item>
        <LinkButton danger auth="schedule.schedule.del" onClick={() => this.handleDelete(info)}>删除</LinkButton>
      </Menu.Item>
    </Menu>
  );

  columns = [{
    title: '任务名称',
    dataIndex: 'name',
  }, {
    title: '任务类型',
    dataIndex: 'type',
  }, {
    title: '最新状态',
    render: info => {
      if (info.is_active) {
        if (info['latest_status_alias']) {
          return <Tag color={this.colors[info['latest_status']]}>{info['latest_status_alias']}</Tag>
        } else {
          return <Tag color="blue">待调度</Tag>
        }
      } else {
        return <Tag>未激活</Tag>
      }
    },
  }, {
    title: '更新于',
    dataIndex: 'latest_run_time_alias',
    sorter: (a, b) => a.latest_run_time.localeCompare(b.latest_run_time)
  }, {
    title: '描述信息',
    dataIndex: 'desc',
    ellipsis: true
  }, {
    title: '操作',
    width: 180,
    render: info => (
      <Action>
        <Action.Button disabled={info['latest_run_time'] === '1970-01-01'}
                       onClick={() => store.showInfo(info)}>详情</Action.Button>
        <Action.Button auth="schedule.schedule.edit" onClick={() => store.showForm(info)}>编辑</Action.Button>
        <Dropdown overlay={() => this.moreMenus(info)} trigger={['click']}>
          <LinkButton>
            更多 <DownOutlined/>
          </LinkButton>
        </Dropdown>
      </Action>
    )
  }];

  handleActive = (text) => {
    Modal.confirm({
      title: '操作确认',
      content: `确定要${text.is_active ? '禁用' : '激活'}任务【${text['name']}】?`,
      onOk: () => {
        return http.patch('/api/schedule/', {id: text.id, is_active: !text.is_active})
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
        return http.delete('/api/schedule/', {params: {id: text.id}})
          .then(() => {
            message.success('删除成功');
            store.fetchRecords()
          })
      }
    })
  };

  handleTest = (text) => {
    Modal.confirm({
      title: '操作确认',
      content: '立即以串行模式执行该任务（不影响调度规则，且不会触发失败通知）？',
      onOk: () => http.post(`/api/schedule/${text.id}/`, null, {timeout: 120000})
        .then(res => store.showInfo(text, res))
    })
  };

  render() {
    return (
      <TableCard
        tKey="si"
        rowKey="id"
        title="任务列表"
        loading={store.isFetching}
        dataSource={store.dataSource}
        onReload={store.fetchRecords}
        actions={[
          <AuthButton
            auth="schedule.schedule.add"
            type="primary"
            icon={<PlusOutlined/>}
            onClick={() => store.showForm()}>新建</AuthButton>,
          <Radio.Group value={store.f_active} onChange={e => store.f_active = e.target.value}>
            <Radio.Button value="">全部</Radio.Button>
            <Radio.Button value="1">已激活</Radio.Button>
            <Radio.Button value="0">未激活</Radio.Button>
          </Radio.Group>
        ]}
        pagination={{
          showSizeChanger: true,
          showLessItems: true,
          showTotal: total => `共 ${total} 条`,
          pageSizeOptions: ['10', '20', '50', '100']
        }}
        columns={this.columns}/>
    )
  }
}

export default ComTable
