/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { observer } from 'mobx-react';
import { Form, Select, Radio, Transfer, Checkbox, Button, InputNumber, Alert, message } from 'antd';
import { http, t } from 'libs';
import groupStore from '../alarm/group/store';
import store from './store';
import lds from 'lodash';

// AI 前置任务的轮次上限与默认值，需与后端 apps/monitor/models.py 的 AI_LOOP_LIMITS 保持一致
const AI_LOOP_LIMITS = {
  '': {ceiling: 60, fallback: 15},
  diagnose: {ceiling: 60, fallback: 15},
  repair: {ceiling: 50, fallback: 20},
};

const modeOptions = [
  {label: t('钉钉'), 'value': '3'},
  {label: t('邮件'), 'value': '4'},
  {label: t('企业微信'), 'value': '5'},
  {label: t('飞书'), 'value': '7'},
];

export default observer(function () {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [hosts, setHosts] = useState([]);
  const [aiMode, setAiMode] = useState(store.record.ai_mode || '');

  useEffect(() => {
    const {type, addr} = store.record;
    if (type === '1' && addr) {
      store.record.sitePrefix = addr.startsWith('http://') ? 'http://' : 'https://';
      store.record.domain = store.record.addr.replace(store.record.sitePrefix, '')
    }
    http.get('/api/host/').then(res => setHosts(res.filter(x => x.is_verified)))
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

  // 诊断与修复共用 ai_max_loops 字段但上限不同，切换模式时要把超出新上限的值夹回来，
  // 否则从「修复20轮」切到诊断会提交一个越界值（后端虽有兜底，但界面显示会误导）
  function handleAiModeChange(mode) {
    setAiMode(mode);
    if (!mode) return;
    const {ceiling, fallback} = AI_LOOP_LIMITS[mode];
    const current = form.getFieldValue('ai_max_loops');
    if (!current) {
      form.setFieldsValue({ai_max_loops: fallback})
    } else if (current > ceiling) {
      form.setFieldsValue({ai_max_loops: ceiling})
    }
  }

  function canNext() {
    const {notify_grp, notify_mode, ai_mode, ai_host_id} = form.getFieldsValue();
    if (ai_mode && !ai_host_id) return false;
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
      <Form.Item name="ai_mode" initialValue={info.ai_mode || ''} label={t('智能处理')}
                 tooltip={t('达到报警阈值后立即发出告警通知，随后由智能体处理，处理完成再追加一条结论通知（共两条）')}>
        <Radio.Group onChange={e => handleAiModeChange(e.target.value)}>
          <Radio value="">{t('不启用')}</Radio>
          <Radio value="diagnose">{t('AI诊断')}</Radio>
          <Radio value="repair">{t('AI修复')}</Radio>
        </Radio.Group>
      </Form.Item>
      {aiMode && (
        <React.Fragment>
          <Form.Item required name="ai_host_id" initialValue={info.ai_host_id} label={t('排查主机')}
                     extra={t('智能体将通过SSH登录该主机进行排查，仅可选择已验证的主机。')}>
            <Select showSearch allowClear optionFilterProp="children" placeholder={t('请选择主机')}>
              {hosts.map(item => (
                <Select.Option key={item.id} value={item.id}>{item.name}（{item.hostname}）</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="ai_max_loops"
            initialValue={info.ai_max_loops || AI_LOOP_LIMITS[aiMode].fallback}
            label={aiMode === 'diagnose' ? t('最大排查轮次') : t('最大修复轮次')}
            extra={aiMode === 'diagnose'
              ? t('每轮为：AI给出命令 → 执行 → 分析；定位到原因会提前结束，达到该次数仍未定位则终止并通知。')
              : t('每轮为：AI给出命令 → 执行 → 自动复检；超过该次数仍未恢复则终止并通知。')}>
            <InputNumber min={1} max={AI_LOOP_LIMITS[aiMode].ceiling} style={{width: 160}} addonAfter={t('轮')}/>
          </Form.Item>
          <Form.Item wrapperCol={{span: 14, offset: 6}}>
            <Alert
              type={aiMode === 'repair' ? 'warning' : 'info'}
              message={aiMode === 'repair'
                ? t('故障时先发告警通知，随后AI在排查主机上执行修复命令（已内置高危命令拦截），修复结束再发一条结果通知，处理过程可在智能体模块查看。')
                : t('故障时先发告警通知，随后AI只执行只读命令排查，不会修改服务器任何内容，排查结束再发一条结论通知。')}/>
          </Form.Item>
        </React.Fragment>
      )}
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