/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { Form, Select, Radio, Transfer, Checkbox, Button, message } from 'antd';
import { http } from 'libs';
import groupStore from '../alarm/group/store';
import store from './store';
import lds from 'lodash';

const modeOptions = [
  {label: '微信', 'value': '1'},
  {label: '短信', 'value': '2', disabled: true},
  {label: '钉钉', 'value': '3'},
  {label: '邮件', 'value': '4'},
  {label: '企业微信', 'value': '5'},
];

export default observer(function () {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const {type, addr} = store.record;
    if (type === '1' && addr) {
      store.record.sitePrefix = addr.startsWith('http://') ? 'http://' : 'https://';
      store.record.domain = store.record.addr.replace(store.record.sitePrefix, '')
    }
  }, [])

  function handleSubmit() {
    setLoading(true)
    const formData = form.getFieldsValue();
    Object.assign(formData, lds.pick(store.record, ['id', 'name', 'desc', 'targets', 'extra', 'type', 'group']))
    formData['id'] = store.record.id;
    http.post('/api/monitor/', formData)
      .then(() => {
        message.success('操作成功');
        store.formVisible = false;
        store.fetchRecords()
      }, () => setLoading(false))
  }

  function canNext() {
    const {notify_grp, notify_mode} = form.getFieldsValue();
    return notify_grp && notify_grp.length && notify_mode && notify_mode.length;
  }

  const info = store.record;
  return (
    <Form form={form} labelCol={{span: 6}} wrapperCol={{span: 14}}>
      <Form.Item name="rate" initialValue={info.rate || 5} label="监控频率">
        <Radio.Group>
          <Radio value={1}>1分钟</Radio>
          <Radio value={5}>5分钟</Radio>
          <Radio value={15}>15分钟</Radio>
          <Radio value={30}>30分钟</Radio>
          <Radio value={60}>60分钟</Radio>
        </Radio.Group>
      </Form.Item>
      <Form.Item name="threshold" initialValue={info.threshold || 3} label="报警阈值">
        <Radio.Group>
          <Radio value={1}>1次</Radio>
          <Radio value={2}>2次</Radio>
          <Radio value={3}>3次</Radio>
          <Radio value={4}>4次</Radio>
          <Radio value={5}>5次</Radio>
        </Radio.Group>
      </Form.Item>
      <Form.Item required name="notify_grp" valuePropName="targetKeys" initialValue={info.notify_grp} label="报警联系人组">
        <Transfer
          lazy={false}
          rowKey={item => item.id}
          titles={['已有联系组', '已选联系组']}
          listStyle={{width: 199}}
          dataSource={groupStore.records}
          render={item => item.name}/>
      </Form.Item>
      <Form.Item required name="notify_mode" initialValue={info.notify_mode} label="报警方式">
        <Checkbox.Group options={modeOptions}/>
      </Form.Item>
      <Form.Item name="quiet" initialValue={info.quiet || 24 * 60} label="通道沉默" extra="相同的告警信息，沉默期内只发送一次。">
        <Select placeholder="请选择">
          <Select.Option value={5}>5分钟</Select.Option>
          <Select.Option value={10}>10分钟</Select.Option>
          <Select.Option value={15}>15分钟</Select.Option>
          <Select.Option value={30}>30分钟</Select.Option>
          <Select.Option value={60}>60分钟</Select.Option>
          <Select.Option value={3 * 60}>3小时</Select.Option>
          <Select.Option value={6 * 60}>6小时</Select.Option>
          <Select.Option value={12 * 60}>12小时</Select.Option>
          <Select.Option value={24 * 60}>24小时</Select.Option>
        </Select>
      </Form.Item>
      <Form.Item shouldUpdate wrapperCol={{span: 14, offset: 6}} style={{marginTop: 12}}>
        {() => (
          <React.Fragment>
            <Button disabled={!canNext()} loading={loading} type="primary" onClick={handleSubmit}>提交</Button>
            <Button style={{marginLeft: 20}} onClick={() => store.page -= 1}>上一步</Button>
          </React.Fragment>
        )}
      </Form.Item>
    </Form>
  )
})