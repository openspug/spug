/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Modal, Table, Tag } from 'antd';
import { LinkButton } from 'components';
import { http, t } from 'libs';
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
    http.get(`/api/schedule/${store.record.id}/`)
      .then(res => this.setState({records: res}))
      .finally(() => this.setState({loading: false}))
  }

  colors = ['orange', 'green', 'red'];

  columns = [{
    title: t('执行时间'),
    dataIndex: 'run_time'
  }, {
    title: t('执行状态'),
    render: info => <Tag color={this.colors[info['status']]}>{info['status_alias']}</Tag>
  }, {
    title: t('操作'),
    render: info => <LinkButton onClick={() => store.showInfo(null, info.id)}>{t('详情')}</LinkButton>
  }];

  render() {
    return (
      <Modal
        visible
        width={800}
        maskClosable={false}
        title={t('任务执行记录 - {}', store.record.name)}
        onCancel={() => store.recordVisible = false}
        footer={null}>
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