/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, Select, Radio, message, Steps, Button, Transfer, Checkbox } from 'antd';
import TemplateSelector from '../exec/task/TemplateSelector';
import { LinkButton, ACEditor } from 'components';
import http from 'libs/http';
import store from './store';
import hostStore from '../host/store';
import groupStore from '../alarm/group/store';
import styles from './index.module.css';

@observer
class ComForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      sitePrefix: 'http://',
      extra: {[store.record.type]: store.record.extra},
      addr: {},
      showTmp: false,
      page: 0,
      modeOptions: [
        {label: '微信', 'value': '1'},
        {label: '短信', 'value': '2', disabled: true},
        {label: '钉钉', 'value': '3'},
        {label: '邮件', 'value': '4'}]
    }
  }

  componentDidMount() {
    let [sitePrefix, value] = ['http://', ''];
    if (store.record.type === '1') {
      if (store.record.addr.includes('http://')) {
        value = store.record.addr.replace('http://', '')
      } else {
        sitePrefix = 'https://';
        value = store.record.addr.replace('https://', '')
      }
      this.setState({sitePrefix, addr: {'1': value}})
    } else if ('34'.includes(store.record.type)) {
      this.setState({addr: {'3': store.record.addr, '4': store.record.addr}})
    } else {
      this.setState({addr: {[store.record.type]: store.record.addr}})
    }
  }

  handleSubmit = () => {
    this.setState({loading: true});
    const formData = this.props.form.getFieldsValue();
    const type = formData['type'];
    formData['id'] = store.record.id;
    formData['extra'] = this.state.extra[type];
    formData['addr'] = type === '1' ? this.state.sitePrefix + this.state.addr[type] : this.state.addr[type];
    http.post('/api/monitor/', formData)
      .then(() => {
        message.success('操作成功');
        store.formVisible = false;
        store.fetchRecords()
      }, () => this.setState({loading: false}))
  };

  getStyle = (t) => {
    const type = this.props.form.getFieldValue('type');
    return t.indexOf(type) !== -1 ? {display: 'block'} : {display: 'none'}
  };

  handleExtra = (t, e) => {
    const value = t === '4' ? e : e.target.value;
    this.setState({extra: Object.assign({}, this.state.extra, {[t]: value})})
  };

  handleAddr = (t, e) => {
    if (t === '3') {
      this.setState({addr: Object.assign({}, this.state.addr, {'3': e, '4': e})})
    } else {
      this.setState({addr: Object.assign({}, this.state.addr, {[t]: e.target.value})})
    }
  };

  siteBefore = () => (
    <Select style={{width: 90}} value={this.state.sitePrefix} onChange={v => this.setState({sitePrefix: v})}>
      <Select.Option value="http://">http://</Select.Option>
      <Select.Option value="https://">https://</Select.Option>
    </Select>
  );

  verifyButtonStatus = () => {
    const data = this.props.form.getFieldsValue();
    const {notify_grp, notify_mode, type, name} = data;
    let b1 = this.state.addr[type] && name;
    if (type !== '1') {
      b1 = b1 && this.state.extra[type]
    }
    const b2 = notify_grp && notify_grp.length && notify_mode && notify_mode.length;
    return [b1, b2];
  };

  render() {
    const info = store.record;
    const {loading, extra, addr, showTmp, page, modeOptions} = this.state;
    const {getFieldDecorator} = this.props.form;
    const [b1, b2] = this.verifyButtonStatus();
    return (
      <Modal
        visible
        width={800}
        maskClosable={false}
        title={store.record.id ? '编辑任务' : '新建任务'}
        onCancel={() => store.formVisible = false}
        footer={null}>
        <Steps current={page} className={styles.steps}>
          <Steps.Step key={0} title="创建任务"/>
          <Steps.Step key={1} title="设置规则"/>
        </Steps>
        <Form labelCol={{span: 6}} wrapperCol={{span: 14}}>
          <div style={{display: page === 0 ? 'block' : 'none'}}>
            <Form.Item label="监控类型">
              {getFieldDecorator('type', {initialValue: info['type'] || '1'})(
                <Select placeholder="请选择监控类型">
                  <Select.Option value="1">站点检测</Select.Option>
                  <Select.Option value="2">端口检测</Select.Option>
                  <Select.Option value="3">进程检测</Select.Option>
                  <Select.Option value="4">自定义脚本</Select.Option>
                </Select>
              )}
            </Form.Item>
            <Form.Item required label="任务名称">
              {getFieldDecorator('name', {initialValue: info['name']})(
                <Input placeholder="请输入任务名称"/>
              )}
            </Form.Item>
            <Form.Item required label="监控地址" style={this.getStyle('1')}>
              <Input value={addr['1']} addonBefore={this.siteBefore()} placeholder="请输入监控地址"
                     onChange={e => this.handleAddr('1', e)}/>
            </Form.Item>
            <Form.Item required label="监控地址" style={this.getStyle('2')}>
              <Input value={addr['2']} placeholder="请输入监控地址（IP/域名）" onChange={e => this.handleAddr('2', e)}/>
            </Form.Item>
            <Form.Item required label="监控主机" style={this.getStyle('34')}>
              <Select value={addr['3']} placeholder="请选择主机" onChange={v => this.handleAddr('3', v)}>
                {hostStore.records.map(item => (
                  <Select.Option value={String(item.id)}
                                 key={item.id}>{item.name}({item.hostname}:{item.port})</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item required label="检测端口" style={this.getStyle('2')}>
              <Input value={extra['2']} placeholder="请输入端口号" onChange={e => this.handleExtra('2', e)}/>
            </Form.Item>
            <Form.Item required label="进程名称" style={this.getStyle('3')}>
              <Input value={extra['3']} placeholder="请输入进程名称" onChange={e => this.handleExtra('3', e)}/>
            </Form.Item>
            <Form.Item required label="脚本内容" style={this.getStyle('4')}
                       extra={<LinkButton onClick={() => this.setState({showTmp: true})}>从模板添加</LinkButton>}>
              <ACEditor mode="sh" value={extra['4']} height="200px" onChange={e => this.handleExtra('4', e)}/>
            </Form.Item>
            <Form.Item label="备注信息">
              {getFieldDecorator('desc', {initialValue: info['desc']})(
                <Input.TextArea placeholder="请输入备注信息"/>
              )}
            </Form.Item>
          </div>
          <div style={{display: page === 1 ? 'block' : 'none'}}>
            <Form.Item label="监控频率">
              {getFieldDecorator('rate', {initialValue: info['rate'] || 5})(
                <Radio.Group>
                  <Radio value={1}>1分钟</Radio>
                  <Radio value={5}>5分钟</Radio>
                  <Radio value={15}>15分钟</Radio>
                  <Radio value={30}>30分钟</Radio>
                  <Radio value={60}>60分钟</Radio>
                </Radio.Group>
              )}
            </Form.Item>
            <Form.Item label="报警阈值">
              {getFieldDecorator('threshold', {initialValue: info['threshold'] || 3})(
                <Radio.Group>
                  <Radio value={1}>1次</Radio>
                  <Radio value={2}>2次</Radio>
                  <Radio value={3}>3次</Radio>
                  <Radio value={4}>4次</Radio>
                  <Radio value={5}>5次</Radio>
                </Radio.Group>
              )}
            </Form.Item>
            <Form.Item required label="报警联系人组">
              {getFieldDecorator('notify_grp', {valuePropName: 'targetKeys', initialValue: info['notify_grp']})(
                <Transfer
                  lazy={false}
                  rowKey={item => item.id}
                  titles={['已有联系组', '已选联系组']}
                  listStyle={{width: 199}}
                  dataSource={groupStore.records}
                  render={item => item.name}/>
              )}
            </Form.Item>
            <Form.Item required label="报警方式">
              {getFieldDecorator('notify_mode', {initialValue: info['notify_mode']})(
                <Checkbox.Group options={modeOptions}/>
              )}
            </Form.Item>
            <Form.Item label="通道沉默">
              {getFieldDecorator('quiet', {initialValue: info['quiet'] || 24 * 60})(
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
              )}
            </Form.Item>
          </div>
          <Form.Item wrapperCol={{span: 14, offset: 6}}>
            {page === 1 &&
            <Button disabled={!b2} type="primary" onClick={this.handleSubmit} loading={loading}>提交</Button>}
            {page === 0 &&
            <Button disabled={!b1} type="primary" onClick={() => this.setState({page: page + 1})}>下一步</Button>}
            {page !== 0 &&
            <Button style={{marginLeft: 20}} onClick={() => this.setState({page: page - 1})}>上一步</Button>}
          </Form.Item>
        </Form>
        {showTmp && <TemplateSelector
          onOk={command => this.handleExtra('4', command)}
          onCancel={() => this.setState({showTmp: false})}/>}
      </Modal>
    )
  }
}

export default Form.create()(ComForm)
