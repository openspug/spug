/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { Form, Tabs, DatePicker, InputNumber, Input, Button, Cascader } from 'antd';
import { LoadingOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Container } from 'components';
import { http, includes } from 'libs';
import S from './store';
import moment from 'moment';
import lds from 'lodash';
import styles from './index.module.less';
import mStore from '../monitor/store';

let lastFetchId = 0;

export default observer(function (props) {
  const [nextRunTime, setNextRunTime] = useState(null);

  useEffect(() => {
    if (mStore.records.length === 0) {
      mStore.fetchRecords()
        .then(_initial)
    } else {
      _initial()
    }
  }, [])

  function _initial() {
    if (S.trigger_args?.monitor) {
      let args = S.trigger_args.monitor
      args = args.map(x => lds.find(mStore.records, {id: x}))
        .filter(x => x).map(x => ([x.group, x.id]))
      S.trigger_args.monitor = args
    }
  }

  function handleArgs(key, val) {
    S.trigger_args[key] = val
  }

  function handleCronArgs(key, val) {
    let tmp = S.trigger_args['cron'] || {};
    tmp[key] = val
    S.trigger_args['cron'] = tmp
    _fetchNextRunTime()
  }

  function handleMonitorArgs(index, val) {
    const tmp = S.trigger_args['monitor'] ?? [[]]
    if (index === undefined) {
      tmp.push([])
    } else if (val) {
      tmp[index] = val
    } else {
      tmp.splice(index, 1)
    }
    S.trigger_args['monitor'] = tmp
  }

  function isValid() {
    switch (S.trigger) {
      case 'cron':
        return lds.get(S.trigger_args, 'cron.rule')
      case 'monitor':
        return lds.get(S.trigger_args, 'monitor', []).map(x => x[1]).filter(x => x).length
      default:
        return S.trigger_args[S.trigger]
    }
  }

  function _fetchNextRunTime() {
    if (S.trigger === 'cron') {
      const {rule, start, stop} = lds.get(S.trigger_args, 'cron', {});
      if (rule && rule.trim().split(/ +/).length === 5) {
        setNextRunTime(<LoadingOutlined/>);
        lastFetchId += 1;
        const fetchId = lastFetchId;
        const formData = {rule}
        if (start) formData.start = start.format('YYYY-MM-DD HH:mm:ss')
        if (stop) formData.stop = stop.format('YYYY-MM-DD HH:mm:ss')
        http.post('/api/schedule/run_time/', formData)
          .then(res => {
            if (fetchId !== lastFetchId) return;
            if (res.success) {
              setNextRunTime(<span style={{fontSize: 12, color: '#52c41a'}}>{res.msg}</span>)
            } else {
              setNextRunTime(<span style={{fontSize: 12, color: '#ff4d4f'}}>{res.msg}</span>)
            }
          })
      } else {
        setNextRunTime(null)
      }
    }
  }

  return (
    <Container visible={props.visible}>
      <Form layout="vertical" wrapperCol={{span: 14, offset: 5}}>
        <Form.Item>
          <Tabs activeKey={S.trigger} className={styles.tabs} onChange={v => S.trigger = v} tabPosition="left">
            <Tabs.TabPane tab="普通间隔" key="interval">
              <Form.Item required label="间隔时间(秒)" extra="每隔指定n秒执行一次。">
                <InputNumber
                  min={10}
                  style={{width: 200}}
                  placeholder="请输入"
                  value={S.trigger_args.interval}
                  onChange={v => handleArgs('interval', v)}/>
              </Form.Item>
            </Tabs.TabPane>
            <Tabs.TabPane tab="一次性" key="date">
              <Form.Item required label="执行时间" extra="仅在指定时间运行一次。">
                <DatePicker
                  showTime
                  disabledDate={v => v < moment()}
                  style={{width: 200}}
                  placeholder="请选择执行时间"
                  onOk={() => false}
                  value={S.trigger_args.date}
                  onChange={v => handleArgs('date', v)}/>
              </Form.Item>
            </Tabs.TabPane>
            <Tabs.TabPane tab="UNIX Cron" key="cron">
              <Form.Item required label="执行规则" extra="兼容Cron风格，可参考官方例子。">
                <Input
                  suffix={nextRunTime || <span/>}
                  value={S.trigger_args.cron?.rule}
                  placeholder="例如每天凌晨1点执行：0 1 * * *"
                  onChange={e => handleCronArgs('rule', e.target.value)}/>
              </Form.Item>
              <Form.Item label="生效时间" extra="定义的执行规则在到达该时间后生效。">
                <DatePicker
                  showTime
                  style={{width: '100%'}}
                  placeholder="可选输入"
                  value={S.trigger_args.cron?.start}
                  onChange={v => handleCronArgs('start', v)}/>
              </Form.Item>
              <Form.Item label="结束时间" extra="执行规则在到达该时间后不再执行。">
                <DatePicker
                  showTime
                  style={{width: '100%'}}
                  placeholder="可选输入"
                  value={S.trigger_args.cron?.stop}
                  onChange={v => handleCronArgs('stop', v)}/>
              </Form.Item>
            </Tabs.TabPane>
            <Tabs.TabPane tab="监控告警" key="monitor">
              <Form.Item required label="监控项目">
                {lds.get(S.trigger_args, 'monitor', [[]]).map((item, index) => (
                  <React.Fragment key={index}>
                    <Cascader
                      placeholder="请选择"
                      value={item}
                      options={mStore.cascaderOptions}
                      style={{width: '80%', marginRight: 10, marginBottom: 12}}
                      showSearch={{filter: (i, p) => p.some(o => includes(o.label, i))}}
                      onChange={v => handleMonitorArgs(index, v)}/>
                    {S.trigger_args.monitor?.length > 1 && (
                      <MinusCircleOutlined className={styles.delIcon} onClick={() => handleMonitorArgs(index)}/>
                    )}
                  </React.Fragment>
                ))}
              </Form.Item>
              <Form.Item extra="当监控项触发告警时执行。">
                <Button type="dashed" style={{width: '80%'}} onClick={() => handleMonitorArgs()}>
                  <PlusOutlined/>添加监控项
                </Button>
              </Form.Item>
            </Tabs.TabPane>
          </Tabs>
        </Form.Item>
        <Form.Item wrapperCol={{span: 14, offset: 6}}>
          <Button type="primary" disabled={!isValid()} onClick={() => S.page += 1}>下一步</Button>
          <Button style={{marginLeft: 20}} onClick={() => S.page -= 1}>上一步</Button>
        </Form.Item>
      </Form>
    </Container>
  )
})