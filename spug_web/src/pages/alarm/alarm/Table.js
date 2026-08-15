/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Radio, Tag, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { TableCard } from 'components';
import { t } from 'libs';
import store from './store';
import groupStore from '../group/store';

@observer
class ComTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      groupMap: {}
    }
  }

  componentDidMount() {
    store.fetchRecords();
    if (groupStore.records.length === 0) {
      groupStore.fetchRecords().then(this._handleGroups)
    } else {
      this._handleGroups()
    }
  }

  _handleGroups = () => {
    const tmp = {};
    for (let item of groupStore.records) {
      tmp[item.id] = item.name
    }
    this.setState({groupMap: tmp})
  };

  columns = [{
    title: t('任务名称'),
    dataIndex: 'name',
  }, {
    title: t('监控类型'),
    dataIndex: 'type',
  }, {
    title: t('监控对象'),
    dataIndex: 'target'
  }, {
    title: t('状态'),
    dataIndex: 'status',
    render: value => value === '1' ? <Tag color="orange">{t('报警发生')}</Tag> : <Tag color="green">{t('故障恢复')}</Tag>
  }, {
    title: t('持续时间'),
    dataIndex: 'duration',
  }, {
    title: t('通知方式'),
    dataIndex: 'notify_mode',
  }, {
    title: t('通知对象'),
    dataIndex: 'notify_grp',
    render: value => value.map(id => this.state.groupMap[id]).join(',')
  }, {
    title: t('发生时间'),
    dataIndex: 'created_at'
  }];

  render() {
    return (
      <TableCard
        tKey="aa"
        rowKey="id"
        title={(
          <div style={{display: 'flex', alignItems: 'center'}}>
            <div>{t('报警历史记录')}</div>
            <Tooltip title={t('每天自动清理，仅保留最近30天的报警记录。')}>
              <QuestionCircleOutlined style={{color: '#999', marginLeft: 8}}/>
            </Tooltip>
          </div>
        )}
        loading={store.isFetching}
        dataSource={store.dataSource}
        onReload={store.fetchRecords}
        actions={[
          <Radio.Group value={store.f_status} onChange={e => store.f_status = e.target.value}>
            <Radio.Button value="">{t('全部')}</Radio.Button>
            <Radio.Button value="1">{t('报警发生')}</Radio.Button>
            <Radio.Button value="2">{t('报警恢复')}</Radio.Button>
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
