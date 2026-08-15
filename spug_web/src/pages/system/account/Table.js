/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { ExclamationCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Form, Radio, Modal, Button, Badge, message, Input } from 'antd';
import { TableCard, Action } from 'components';
import { t } from 'libs';
import http from 'libs/http';
import store from './store';
import rStore from '../role/store';

@observer
class ComTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      password: ''
    }
  }

  componentDidMount() {
    if (rStore.records.length === 0) {
      rStore.fetchRecords()
        .then(() => store.fetchRecords())
    } else {
      store.fetchRecords()
    }
  }

  columns = [{
    title: t('登录名'),
    dataIndex: 'username',
  }, {
    title: t('姓名'),
    dataIndex: 'nickname',
  }, {
    title: t('角色'),
    dataIndex: 'role_ids',
    render: v => v.map(x => rStore.idMap[x]?.name).join(',')
  }, {
    title: t('状态'),
    render: text => text['is_active'] ? <Badge status="success" text={t('正常')}/> : <Badge status="default" text={t('禁用')}/>
  }, {
    title: t('最近登录'),
    dataIndex: 'last_login'
  }, {
    title: t('操作'),
    render: info => (
      <Action>
        <Action.Button onClick={() => this.handleActive(info)}>{info['is_active'] ? t('禁用') : t('启用')}</Action.Button>
        <Action.Button onClick={() => store.showForm(info)}>{t('编辑')}</Action.Button>
        <Action.Button disabled={info['type'] === 'ldap'} onClick={() => this.handleReset(info)}>{t('重置密码')}</Action.Button>
        <Action.Button danger onClick={() => this.handleDelete(info)}>{t('删除')}</Action.Button>
      </Action>
    )
  }];

  handleActive = (text) => {
    Modal.confirm({
      title: t('操作确认'),
      content: text['is_active'] ? t('确定要禁用【{}】?', text['nickname']) : t('确定要启用【{}】?', text['nickname']),
      onOk: () => {
        return http.patch(`/api/account/user/`, {id: text.id, is_active: !text['is_active']})
          .then(() => {
            message.success(t('操作成功'));
            store.fetchRecords()
          })
      }
    })
  };

  handleReset = (info) => {
    Modal.confirm({
      icon: <ExclamationCircleOutlined/>,
      title: t('重置登录密码'),
      content: <Form layout="vertical" style={{marginTop: 24}}>
        <Form.Item required label={t('重置后的新密码')} extra={t('至少8位包含数字、小写和大写字母。')}>
          <Input.Password onChange={val => this.setState({password: val.target.value})}/>
        </Form.Item>
      </Form>,
      onOk: () => {
        return http.patch('/api/account/user/', {id: info.id, password: this.state.password})
          .then(() => message.success(t('重置成功'), 0.5))
      },
    })
  };

  handleDelete = (text) => {
    Modal.confirm({
      title: t('删除确认'),
      content: t('确定要删除【{}】?', text['nickname']),
      onOk: () => {
        return http.delete('/api/account/user/', {params: {id: text.id}})
          .then(() => {
            message.success(t('删除成功'));
            store.fetchRecords()
          })
      }
    })
  };

  render() {
    return (
      <TableCard
        tKey="sa"
        rowKey="id"
        title={t('账户列表')}
        loading={store.isFetching}
        dataSource={store.dataSource}
        onReload={store.fetchRecords}
        actions={[
          <Button type="primary" icon={<PlusOutlined/>} onClick={() => store.showForm()}>{t('新建')}</Button>,
          <Radio.Group value={store.f_status} onChange={e => store.f_status = e.target.value}>
            <Radio.Button value="">{t('全部')}</Radio.Button>
            <Radio.Button value="true">{t('正常')}</Radio.Button>
            <Radio.Button value="false">{t('禁用')}</Radio.Button>
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
