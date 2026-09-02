/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Button, Modal, Space, Table, Tag, message } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { LinkButton, AuthFragment } from 'components';
import { hasPermission, http, t } from 'libs';
import store from './store';

@observer
class Record extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      records: []
    }
  }

  componentDidMount() {
    this.fetchRecords()
  }

  fetchRecords = () => {
    this.setState({loading: true})
    return http.get(`/api/schedule/${store.record.id}/`)
      .then(res => this.setState({records: res}))
      .finally(() => this.setState({loading: false}))
  };

  handleDelete = (info) => {
    Modal.confirm({
      title: t('删除确认'),
      content: t('确定要删除 {} 的执行记录？', info['run_time']),
      okButtonProps: {danger: true},
      onOk: () => http.delete(`/api/schedule/${store.record.id}/`, {params: {id: info.id}})
        .then(() => {
          message.success(t('删除成功'));
          store.fetchRecords();
          return this.fetchRecords()
        })
    })
  };

  handleClear = () => {
    Modal.confirm({
      title: t('清空确认'),
      content: t('确定要清空该任务的全部 {} 条执行记录？此操作不可恢复。', this.state.records.length),
      okButtonProps: {danger: true},
      onOk: () => http.delete(`/api/schedule/${store.record.id}/`)
        .then(() => {
          message.success(t('清空成功'));
          store.fetchRecords();
          return this.fetchRecords()
        })
    })
  };

  colors = ['orange', 'green', 'red', 'gold'];

  columns = [{
    title: t('执行时间'),
    dataIndex: 'run_time'
  }, {
    title: t('执行状态'),
    render: info => <Tag color={this.colors[info['status']]}>{info['status_alias']}</Tag>
  }, {
    title: t('操作'),
    width: 140,
    render: info => (
      <Space size={12}>
        <LinkButton onClick={() => store.showInfo(null, info.id)}>{t('详情')}</LinkButton>
        <AuthFragment auth="schedule.schedule.del">
          <LinkButton danger onClick={() => this.handleDelete(info)}>{t('删除')}</LinkButton>
        </AuthFragment>
      </Space>
    )
  }];

  render() {
    return (
      <Modal
        open
        width={800}
        maskClosable={false}
        title={t('任务执行记录 - {}', store.record.name)}
        onCancel={() => store.recordVisible = false}
        footer={null}>
        {hasPermission('schedule.schedule.del') && (
          <div style={{textAlign: 'right', marginBottom: 12}}>
            <Button danger icon={<DeleteOutlined/>}
                    disabled={this.state.loading || !this.state.records.length}
                    onClick={this.handleClear}>{t('清空记录')}</Button>
          </div>
        )}
        <Table
          rowKey="id"
          columns={this.columns}
          dataSource={this.state.records}
          pagination={{
            showSizeChanger: true,
            showLessItems: true,
            hideOnSinglePage: true,
            showTotal: total => t('共 {} 条', total),
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          loading={this.state.loading}/>
      </Modal>
    )
  }
}

export default Record
