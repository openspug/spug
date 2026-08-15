/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { PlusOutlined } from '@ant-design/icons';
import { Radio, Modal, Button, Tag, message } from 'antd';
import { TableCard, Action } from 'components';
import { t } from 'libs';
import http from 'libs/http';
import store from './store';

@observer
class ComTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      password: ''
    }
  }

  componentDidMount() {
    store.fetchRecords()
  }

  columns = [{
    title: t('凭据类型'),
    dataIndex: 'type_alias',
  }, {
    title: t('凭据名称'),
    dataIndex: 'name',
  }, {
    title: t('用户名'),
    dataIndex: 'username',
  }, {
    title: t('可共享'),
    dataIndex: 'is_public',
    render: v => v ? <Tag color="green">{t('开启')}</Tag> : <Tag>{t('关闭')}</Tag>
  }, {
    title: t('操作'),
    render: info => (
      <Action>
        <Action.Button onClick={() => store.showForm(info)}>{t('编辑')}</Action.Button>
        <Action.Button danger onClick={() => this.handleDelete(info)}>{t('删除')}</Action.Button>
      </Action>
    )
  }];

  handleDelete = (text) => {
    Modal.confirm({
      title: t('删除确认'),
      content: t('确定要删除【{}】?', text.name),
      onOk: () => {
        return http.delete('/api/credential/', {params: {id: text.id}})
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
        tKey="sc"
        rowKey="id"
        title={t('凭据列表')}
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
