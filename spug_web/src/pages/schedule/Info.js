/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { Alert, Modal, Tabs, Spin } from 'antd';
import { StatisticsCard } from 'components';
import http from 'libs/http';
import { t } from 'libs';
import store from './store';
import moment from 'moment';

class ComForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      info: {}
    }
  }

  componentDidMount() {
    http.get(`/api/schedule/${store.record.id}/?id=${store.record.h_id}`)
      .then(info => this.setState({info}))
      .finally(() => this.setState({loading: false}))
  }

  render() {
    const {run_time, success, failure, interrupted, duration, outputs, ai_status, ai_summary, ai_model} = this.state.info;
    const preStyle = {
      marginTop: 5,
      backgroundColor: '#eee',
      borderRadius: 5,
      padding: 10,
      maxHeight: 215,
    };
    return (
      <Modal
        open
        width={800}
        maskClosable={false}
        title={t('任务执行详情')}
        onCancel={() => store.infoVisible = false}
        footer={null}>
        <Spin spinning={this.state.loading}>
          <StatisticsCard loading={this.state.loading}>
            <StatisticsCard.Item title={t('执行成功')} value={<span style={{color: '#3f8600'}}>{success}</span>}/>
            <StatisticsCard.Item title={t('执行失败')} value={<span style={{color: '#cf1322'}}>{failure}</span>}/>
            {interrupted > 0 && (
              <StatisticsCard.Item title={t('已中断')} value={<span style={{color: '#d48806'}}>{interrupted}</span>}/>
            )}
            <StatisticsCard.Item bordered={false} title={t('平均耗时(秒)')} value={<span style={{color: ''}}>{duration}</span>}/>
          </StatisticsCard>
          {ai_summary && (
            <Alert
              showIcon
              type={ai_status === 'success' ? 'info' : 'warning'}
              message={ai_status === 'success' ? t('AI 分析结果') : t('AI 分析异常')}
              description={<div style={{whiteSpace: 'pre-wrap'}}>{ai_summary}{ai_model ? `\n\n${t('模型')}: ${ai_model}` : ''}</div>}
              style={{margin: '12px 0 16px'}}/>
          )}
          {outputs && (
            <Tabs
              tabPosition="left"
              defaultActiveKey="0"
              style={{width: 700, height: 350, margin: 'auto'}}
              items={outputs.map((item, index) => ({
                key: `${index}`,
                label: item.code === 0 ? item.name : <span style={{color: 'red'}}>{item.name}</span>,
                children: (
                  <>
                    <div>{t('执行时间： {}（{}）', run_time, moment(run_time).fromNow())}</div>
                    <div style={{marginTop: 5}}>{t('运行耗时： {} s', item.duration)}</div>
                    <div style={{marginTop: 5}}>{t('返回状态： {}（非 0 则判定为失败）', item.code)}</div>
                    <div style={{marginTop: 5}}>{t('执行输出：')} <pre style={preStyle}>{item.output}</pre></div>
                  </>
                )
              }))}/>
          )}
        </Spin>
      </Modal>
    )
  }
}

export default ComForm
