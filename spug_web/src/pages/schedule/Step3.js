/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { observer } from 'mobx-react';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Form, Select, Button, message } from 'antd';
import { Container } from 'components';
import HostSelector from 'pages/host/Selector';
import hostStore from 'pages/host/store';
import moment from 'moment';
import lds from 'lodash';
import { http } from 'libs';
import S from './store';
import styles from './index.module.less';

export default observer(function (props) {
  const [loading, setLoading] = useState(false)

  function handleSubmit() {
    const formData = lds.pick(S.record, ['id', 'name', 'type', 'interpreter', 'command', 'desc', 'rst_notify']);
    formData['targets'] = S.targets.filter(x => x);
    formData['trigger'] = S.trigger;
    formData['trigger_args'] = _parse_args();
    if (S.trigger === 'monitor') {
      if (formData.targets.length > 1) {
        return message.error('监控告警类触发器，只能选择一个执行对象')
      }
    } else if (formData.targets.includes('monitor')) {
      return message.error('执行对象选择有误，请重新选择')
    }
    setLoading(true)
    http.post('/api/schedule/', formData)
      .then(res => {
        message.success('操作成功');
        S.formVisible = false;
        S.fetchRecords()
      }, () => setLoading(false))
  }

  function _parse_args() {
    switch (S.trigger) {
      case 'date':
        return S.trigger_args.date.format('YYYY-MM-DD HH:mm:ss');
      case 'cron':
        const {rule, start, stop} = S.trigger_args.cron;
        return JSON.stringify({
          rule,
          start: start ? moment(start).format('YYYY-MM-DD HH:mm:ss') : null,
          stop: stop ? moment(stop).format('YYYY-MM-DD HH:mm:ss') : null
        });
      case 'monitor':
        return JSON.stringify(S.trigger_args.monitor.map(x => x[1]).filter(x => x))
      default:
        return S.trigger_args[S.trigger];
    }
  }

  function handleChange(ids) {
    if (S.targets.includes('local')) {
      ids.unshift('local')
    }
    S.targets = ids
  }

  return (
    <Container visible={props.visible} style={{width: 420, margin: '0 auto'}}>
      <Form layout="vertical" style={{minHeight: 200}}>
        <Form.Item required label="执行对象">
          {S.targets.map((id, index) => (
            <React.Fragment key={index}>
              <Select
                value={id}
                showSearch
                placeholder="请选择"
                optionFilterProp="children"
                style={{width: 'calc(100% - 40px)', marginRight: 10, marginBottom: 12}}
                filterOption={(input, option) => option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
                onChange={v => S.editTarget(index, v)}>
                <Select.Option value="local" disabled={S.targets.includes('local')}>本机</Select.Option>
                {S.trigger === 'monitor' &&
                  <Select.Option value="monitor" disabled={S.targets.includes('monitor')}>告警关联主机</Select.Option>}
                {hostStore.rawRecords.map(item => (
                  <Select.Option key={item.id} value={item.id} disabled={S.targets.includes(item.id)}>
                    {`${item.name}(${item['hostname']}:${item['port']})`}
                  </Select.Option>
                ))}
              </Select>
              {S.targets.length > 1 && (
                <MinusCircleOutlined className={styles.delIcon} onClick={() => S.delTarget(index)}/>
              )}
            </React.Fragment>
          ))}
        </Form.Item>
        <Form.Item extra="本机即Spug服务运行所在的容器或主机。">
          <HostSelector value={S.targets.filter(x => x !== 'local')} onChange={handleChange}>
            <Button type="dashed" style={{width: 'calc(100% - 40px)'}} disabled={S.trigger === 'monitor'}>
              <PlusOutlined/>添加执行对象
            </Button>
          </HostSelector>
        </Form.Item>
        <Form.Item>
          <Button loading={loading} disabled={S.targets.filter(x => x).length === 0} type="primary"
                  onClick={handleSubmit}>提交</Button>
          <Button style={{marginLeft: 20}} onClick={() => S.page -= 1}>上一步</Button>
        </Form.Item>
      </Form>
    </Container>
  )
})
