/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, Select, Radio, message, Steps, Button, Transfer, Checkbox } from 'antd';
import TemplateSelector from '../exec/task/TemplateSelector';
import { LinkButton, ACEditor } from 'components';
import { http, cleanCommand, hasHostPermission } from 'libs';
import store from './store';
import hostStore from '../host/store';
import groupStore from '../alarm/group/store';
import styles from './index.module.css';
import lds from 'lodash';

@observer
class ComForm extends React.Component {
  constructor(props) {
    super(props);
    this.fieldMap = {
      '1': ['domain'],
      '2': ['addr', 'port'],
      '3': ['host', 'process'],
      '4': ['host', 'command'],
      '5': ['addr'],
    }
    this.modeOptions = [
      {label: '微信', 'value': '1'},
      {label: '短信', 'value': '2', disabled: true},
      {label: '钉钉', 'value': '3'},
      {label: '邮件', 'value': '4'},
      {label: '企业微信', 'value': '5'},
    ]
    this.helpMap = {
      '1': '返回HTTP状态码200-399则判定为正常，其他为异常。',
      '4': '脚本执行退出状态码为 0 则判定为正常，其他为异常。'
    }
    this.state = {
      loading: false,
      sitePrefix: 'http://',
      domain: undefined,
      addr: undefined,
      port: undefined,
      host: undefined,
      process: undefined,
      command: '',
      showTmp: false,
      page: 0,
    }
  }

  componentDidMount() {
    const {type, addr, extra} = store.record;
    switch (type) {
      case '1':
        if (addr.startsWith('http://')) {
          this.setState({sitePrefix: 'http://', domain: addr.replace('http://', '')})
        } else {
          this.setState({sitePrefix: 'https://', domain: addr.replace('https://', '')})
        }
        break;
      case '2':
        this.setState({addr, port: extra});
        break;
      case '3':
        this.setState({host: addr, process: extra});
        break;
      case '4':
        this.setState({host: addr, command: extra});
        break;
      case '5':
        this.setState({addr});
        break;
      default:
    }
  }

  _getFieldsValue = (type) => {
    const {sitePrefix, domain, addr, host, port, command, process} = this.state;
    switch (type) {
      case '1':
        return {addr: sitePrefix + domain}
      case '2':
        return {addr, extra: port}
      case '3':
        return {addr: host, extra: process}
      case '4':
        return {addr: host, extra: command}
      case '5':
        return {addr}
      default:
        throw Error('unknown type')
    }
  }

  handleSubmit = () => {
    this.setState({loading: true});
    const formData = this.props.form.getFieldsValue();
    const type = formData['type'];
    formData['id'] = store.record.id;
    Object.assign(formData, this._getFieldsValue(type))
    http.post('/api/monitor/', formData)
      .then(() => {
        message.success('操作成功');
        store.formVisible = false;
        store.fetchRecords()
      }, () => this.setState({loading: false}))
  };

  handleTest = () => {
    this.setState({loading: true});
    const type = this.props.form.getFieldValue('type');
    const formData = this._getFieldsValue(type);
    formData['type'] = type;
    http.post('/api/monitor/test/', formData, {timeout: 120000})
      .then(res => {
        if (res.is_success) {
          Modal.success({content: res.message})
        } else {
          Modal.warning({content: res.message})
        }
      })
      .finally(() => this.setState({loading: false}))
  }

  getStyle = (t) => {
    const type = this.props.form.getFieldValue('type');
    return this.fieldMap[type].includes(t) ? {display: 'block'} : {display: 'none'}
  };

  handleInput = (key, value) => {
    this.setState({[key]: value})
  }

  siteBefore = () => (
    <Select style={{width: 90}} value={this.state.sitePrefix} onChange={v => this.setState({sitePrefix: v})}>
      <Select.Option value="http://">http://</Select.Option>
      <Select.Option value="https://">https://</Select.Option>
    </Select>
  );

  verifyButtonStatus = () => {
    const data = this.props.form.getFieldsValue();
    const {notify_grp, notify_mode, type, name} = data;
    const fields = Object.values(lds.pick(this.state, this.fieldMap[type])).filter(x => x)
    const b1 = name && fields.length === this.fieldMap[type].length
    const b2 = notify_grp && notify_grp.length && notify_mode && notify_mode.length;
    return [b1, b2];
  };

  render() {
    const info = store.record;
    const {loading, domain, host, port, process, command, addr, showTmp, page} = this.state;
    const {getFieldDecorator, getFieldValue} = this.props.form;
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
            <Form.Item label="监控类型" help={this.helpMap[getFieldValue('type') || '1']}>
              {getFieldDecorator('type', {initialValue: info['type'] || '1'})(
                <Select placeholder="请选择监控类型">
                  <Select.Option value="1">站点检测</Select.Option>
                  <Select.Option value="2">端口检测</Select.Option>
                  <Select.Option value="5">Ping检测</Select.Option>
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
            <Form.Item required label="监控地址" style={this.getStyle('domain')}>
              <Input value={domain} addonBefore={this.siteBefore()} placeholder="请输入监控地址"
                     onChange={e => this.handleInput('domain', e.target.value)}/>
            </Form.Item>
            <Form.Item required label="监控地址" style={this.getStyle('addr')}>
              <Input value={addr} placeholder="请输入监控地址（IP/域名）"
                     onChange={e => this.handleInput('addr', e.target.value)}/>
            </Form.Item>
            <Form.Item required label="监控主机" style={this.getStyle('host')}>
              <Select
                showSearch
                value={host}
                placeholder="请选择主机"
                optionFilterProp="children"
                filterOption={(input, option) => option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
                onChange={v => this.handleInput('host', v)}>
                {hostStore.records.filter(x => x.id === Number(host) || hasHostPermission(x.id)).map(item => (
                  <Select.Option value={String(item.id)} key={item.id}>
                    {`${item.name}(${item.hostname}:${item.port})`}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item required label="检测端口" style={this.getStyle('port')}>
              <Input value={port} placeholder="请输入端口号" onChange={e => this.handleInput('port', e.target.value)}/>
            </Form.Item>
            <Form.Item required label="进程名称" style={this.getStyle('process')} help="执行 ps -ef 看到的进程名称。">
              <Input value={process} placeholder="请输入进程名称" onChange={e => this.handleInput('process', e.target.value)}/>
            </Form.Item>
            <Form.Item
              required
              label="脚本内容"
              style={this.getStyle('command')}
              extra={<LinkButton onClick={() => this.setState({showTmp: true})}>从模板添加</LinkButton>}>
              <ACEditor
                mode="sh"
                value={command}
                width="100%"
                height="200px"
                onChange={e => this.handleInput('command', cleanCommand(e))}/>
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
                <Checkbox.Group options={this.modeOptions}/>
              )}
            </Form.Item>
            <Form.Item label="通道沉默" help="相同的告警信息，沉默期内只发送一次。">
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
            {page === 0 && (
              <div>
                <Button disabled={!b1} type="primary" onClick={() => this.setState({page: page + 1})}>下一步</Button>
                <Button disabled={!b1} type="link" loading={loading} style={{marginLeft: 20}} onClick={this.handleTest}>执行测试</Button>
              </div>
            )}
            {page !== 0 &&
            <Button style={{marginLeft: 20}} onClick={() => this.setState({page: page - 1})}>上一步</Button>}
          </Form.Item>
        </Form>
        {showTmp && <TemplateSelector
          onOk={v => this.handleInput('command', command + v)}
          onCancel={() => this.setState({showTmp: false})}/>}
      </Modal>
    )
  }
}

export default Form.create()(ComForm)
