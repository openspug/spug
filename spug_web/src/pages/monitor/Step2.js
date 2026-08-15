/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { observer } from 'mobx-react';
import { Form, Select, Radio, Transfer, Checkbox, Button, message } from 'antd';
import { http, t } from 'libs';
import groupStore from '../alarm/group/store';
import store from './store';
import lds from 'lodash';

const modeOptions = [
  {label: t('微信'), 'value': '1'},
  {label: t('短信'), 'value': '2', disabled: true},
  {label: t('钉钉'), 'value': '3'},
  {label: t('邮件'), 'value': '4'},
  {label: t('企业微信'), 'value': '5'},
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
        message.success(t('操作成功'));
        store.record = {};
        store.formVisible = false;
        store.fetchRecords();
        store.fetchOverviews()
      }, () => setLoading(false))
  }

  function canNext() {
    const {notify_grp, notify_mode} = form.getFieldsValue();
    return notify_grp && notify_grp.length && notify_mode && notify_mode.length;
  }

  const info = store.record;
  return (
    <Form form={form} labelCol={{span: 6}} wrapperCol={{span: 14}}>
      <Form.Item name="rate" initialValue={info.rate || 5} label={t('监控频率')} tooltip={t('每隔N分钟检测一次')}>
        <Radio.Group>
          <Radio value={1}>{t('{}分钟', 1)}</Radio>
          <Radio value={5}>{t('{}分钟', 5)}</Radio>
          <Radio value={15}>{t('{}分钟', 15)}</Radio>
          <Radio value={30}>{t('{}分钟', 30)}</Radio>
          <Radio value={60}>{t('{}分钟', 60)}</Radio>
        </Radio.Group>
      </Form.Item>
      <Form.Item name="threshold" initialValue={info.threshold || 3} label={t('报警阈值')} tooltip={t('连续N次检测失败，则发送告警')}>
        <Radio.Group>
          <Radio value={1}>{t('{}次', 1)}</Radio>
          <Radio value={2}>{t('{}次', 2)}</Radio>
          <Radio value={3}>{t('{}次', 3)}</Radio>
          <Radio value={4}>{t('{}次', 4)}</Radio>
          <Radio value={5}>{t('{}次', 5)}</Radio>
        </Radio.Group>
      </Form.Item>
      <Form.Item required name="notify_grp" valuePropName="targetKeys" initialValue={info.notify_grp} label={t('报警联系人组')}
                 extra={<>{t('去创建')} <Link to="/alarm/contact">{t('报警联系人')}</Link> {t('和')} <Link to="/alarm/group">{t('联系人组')}</Link>{t('。')}</>}>
        <Transfer
          lazy={false}
          rowKey={item => item.id}
          titles={[t('已有联系组'), t('已选联系组')]}
          listStyle={{width: 199}}
          dataSource={groupStore.records}
          render={item => item.name}/>
      </Form.Item>
      <Form.Item required name="notify_mode" initialValue={info.notify_mode} label={t('报警方式')}>
        <Checkbox.Group options={modeOptions}/>
      </Form.Item>
      <Form.Item name="quiet" initialValue={info.quiet || 24 * 60} label={t('通道沉默')} extra={t('相同的告警信息，沉默期内只发送一次。')}>
        <Select placeholder={t('请选择')}>
          <Select.Option value={5}>{t('{}分钟', 5)}</Select.Option>
          <Select.Option value={10}>{t('{}分钟', 10)}</Select.Option>
          <Select.Option value={15}>{t('{}分钟', 15)}</Select.Option>
          <Select.Option value={30}>{t('{}分钟', 30)}</Select.Option>
          <Select.Option value={60}>{t('{}分钟', 60)}</Select.Option>
          <Select.Option value={3 * 60}>{t('{}小时', 3)}</Select.Option>
          <Select.Option value={6 * 60}>{t('{}小时', 6)}</Select.Option>
          <Select.Option value={12 * 60}>{t('{}小时', 12)}</Select.Option>
          <Select.Option value={24 * 60}>{t('{}小时', 24)}</Select.Option>
        </Select>
      </Form.Item>
      <Form.Item shouldUpdate wrapperCol={{span: 14, offset: 6}} style={{marginTop: 12}}>
        {() => (
          <React.Fragment>
            <Button disabled={!canNext()} loading={loading} type="primary" onClick={handleSubmit}>{t('提交')}</Button>
            <Button style={{marginLeft: 20}} onClick={() => store.page -= 1}>{t('上一步')}</Button>
          </React.Fragment>
        )}
      </Form.Item>
    </Form>
  )
})