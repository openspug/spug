/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { Modal, Form, Tabs, Spin } from 'antd';
import { StatisticsCard } from 'components';
import http from 'libs/http';
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
    http.get(`/api/schedule/${store.record.id}/`)
      .then(info => this.setState({info}))
      .finally(() => this.setState({loading: false}))
  }

  render() {
    const {run_time, success, failure, duration, outputs} = this.state.info;
    const preStyle = {
      marginTop: 5,
      backgroundColor: '#eee',
      borderRadius: 5,
      padding: 10,
      maxHeight: 215,
    };
    return (
      <Modal
        visible
        width={800}
        maskClosable={false}
        title="任务执行详情"
        onCancel={() => store.infoVisible = false}
        footer={null}>
        <Spin spinning={this.state.loading}>
          <StatisticsCard loading={this.state.loading}>
            <StatisticsCard.Item title="执行成功" value={<span style={{color: '#3f8600'}}>{success}</span>}/>
            <StatisticsCard.Item title="执行失败" value={<span style={{color: '#cf1322'}}>{failure}</span>}/>
            <StatisticsCard.Item bordered={false} title="平均耗时(秒)" value={<span style={{color: ''}}>{duration}</span>}/>
          </StatisticsCard>
          {outputs && (
            <Tabs tabPosition="left" defaultActiveKey="0" style={{width: 700, height: 350, margin: 'auto'}}>
              {outputs.map((item, index) => (
                <Tabs.TabPane
                  key={`${index}`}
                  tab={item.code === 0 ? item.name : <span style={{color: 'red'}}>{item.name}</span>}>
                  <div>执行时间： {run_time}（{moment(run_time).fromNow()}）</div>
                  <div style={{marginTop: 5}}>运行耗时： {item.duration} s</div>
                  <div style={{marginTop: 5}}>返回状态： {item.code}</div>
                  <div style={{marginTop: 5}}>执行输出： <pre style={preStyle}>{item.output}</pre></div>
                </Tabs.TabPane>
              ))}
            </Tabs>
          )}
        </Spin>
      </Modal>
    )
  }
}

export default Form.create()(ComForm)
