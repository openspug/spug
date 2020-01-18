/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Modal, Form, Input, Select, Col, Button, Steps, Tabs, InputNumber, DatePicker, Icon, message } from 'antd';
import { LinkButton, ACEditor } from 'components';
import TemplateSelector from '../exec/task/TemplateSelector';
import http from 'libs/http';
import store from './store';
import hostStore from '../host/store';
import styles from './index.module.css';
import moment from 'moment';

@observer
class ComForm extends React.Component {
  constructor(props) {
    super(props);
    this.isFirstRender = true;
    this.state = {
      loading: false,
      type: null,
      page: 0,
      args: {[store.record['trigger']]: store.record['trigger_args']},
      command: store.record['command'],
    }
  }

  componentDidMount() {
    store.targets = store.record.id ? store.record['targets'] : [undefined];
    if (hostStore.records.length === 0) {
      hostStore.fetchRecords()
    }
  }

  _parse_args = (trigger) => {
    switch (trigger) {
      case 'date':
        return this.state.args['date'].format('YYYY-MM-DD HH:mm:ss');
      default:
        return this.state.args[trigger];
    }
  };

  handleSubmit = () => {
    const formData = this.props.form.getFieldsValue();
    if (formData['trigger'] === 'date' && this.state.args['date'] <= moment()) {
      return message.error('任务执行时间不能早于当前时间')
    }
    this.setState({loading: true});
    formData['id'] = store.record.id;
    formData['command'] = this.state.command;
    formData['targets'] = store.targets.filter(x => x);
    formData['trigger_args'] = this._parse_args(formData['trigger']);
    http.post('/api/schedule/', formData)
      .then(res => {
        message.success('操作成功');
        store.formVisible = false;
        store.fetchRecords()
      }, () => this.setState({loading: false}))
  };

  handleAddZone = () => {
    Modal.confirm({
      icon: 'exclamation-circle',
      title: '添加任务类型',
      content: this.addZoneForm,
      onOk: () => {
        if (this.state.type) {
          store.types.push(this.state.type);
          this.props.form.setFieldsValue({'type': this.state.type})
        }
      },
    })
  };

  addZoneForm = (
    <Form>
      <Form.Item required label="任务类型">
        <Input onChange={val => this.setState({type: val.target.value})}/>
      </Form.Item>
    </Form>
  );

  handleArgs = (type, value) => {
    const args = Object.assign(this.state.args, {[type]: value});
    this.setState({args})
  };

  verifyButtonStatus = () => {
    const data = this.props.form.getFieldsValue();
    let b1 = data['type'] && data['name'] && this.state.command;
    const b2 = store.targets.filter(x => x).length > 0;
    const b3 = this.state.args[data['trigger']];
    if (!b1 && this.isFirstRender && store.record.id) {
      this.isFirstRender = false;
      b1 = true
    }
    return [b1, b2, b3];
  };

  render() {
    const info = store.record;
    const {getFieldDecorator} = this.props.form;
    const {page, args, loading, showTmp} = this.state;
    const [b1, b2, b3] = this.verifyButtonStatus();
    return (
      <Modal
        visible
        width={800}
        maskClosable={false}
        title={store.record.id ? '编辑任务' : '新建任务'}
        okText={page === 0 ? '下一步' : '确定'}
        onCancel={() => store.formVisible = false}
        footer={null}>
        <Steps current={page} className={styles.steps}>
          <Steps.Step key={0} title="创建任务"/>
          <Steps.Step key={1} title="选择执行对象"/>
          <Steps.Step key={2} title="设置触发器"/>
        </Steps>
        <Form labelCol={{span: 6}} wrapperCol={{span: 14}}>
          <div style={{display: page === 0 ? 'block' : 'none'}}>
            <Form.Item required label="任务类型">
              <Col span={16}>
                {getFieldDecorator('type', {initialValue: info['type']})(
                  <Select placeholder="请选择任务类型">
                    {store.types.map(item => (
                      <Select.Option value={item} key={item}>{item}</Select.Option>
                    ))}
                  </Select>
                )}
              </Col>
              <Col span={6} offset={2}>
                <Button type="link" onClick={this.handleAddZone}>添加类型</Button>
              </Col>
            </Form.Item>
            <Form.Item required label="任务名称">
              {getFieldDecorator('name', {initialValue: info['name']})(
                <Input placeholder="请输入任务名称"/>
              )}
            </Form.Item>
            <Form.Item
              required
              label="任务内容"
              extra={<LinkButton onClick={() => this.setState({showTmp: true})}>从模板添加</LinkButton>}>
              <ACEditor
                mode="sh"
                value={this.state.command}
                onChange={val => this.setState({command: val})}
                height="150px"/>
            </Form.Item>
            <Form.Item label="备注信息">
              {getFieldDecorator('desc', {initialValue: info['desc']})(
                <Input.TextArea placeholder="请输入模板备注信息"/>
              )}
            </Form.Item>
          </div>
          <div style={{minHeight: 224, display: page === 1 ? 'block' : 'none'}}>
            <Form.Item required label="执行对象">
              {store.targets.map((id, index) => (
                <React.Fragment key={index}>
                  <Select
                    value={id}
                    placeholder="请选择"
                    style={{width: '60%', marginRight: 10}}
                    onChange={v => store.editTarget(index, v)}>
                    <Select.Option value="local" disabled={store.targets.includes('local')}>本机</Select.Option>
                    {hostStore.records.map(item => (
                      <Select.Option key={item.id} value={item.id} disabled={store.targets.includes(item.id)}>
                        {item.name}({item['hostname']}:{item['port']})
                      </Select.Option>
                    ))}
                  </Select>
                  {store.targets.length > 1 && (
                    <Icon className={styles.delIcon} type="minus-circle-o" onClick={() => store.delTarget(index)}/>
                  )}
                </React.Fragment>
              ))}
            </Form.Item>
            <Form.Item wrapperCol={{span: 14, offset: 6}}>
              <Button type="dashed" style={{width: '60%'}} onClick={store.addTarget}>
                <Icon type="plus"/>添加执行对象
              </Button>
            </Form.Item>
          </div>
          <div style={{display: page === 2 ? 'block' : 'none'}}>
            <Form.Item wrapperCol={{span: 14, offset: 6}}>
              {getFieldDecorator('trigger', {valuePropName: 'activeKey', initialValue: info['trigger'] || 'interval'})(
                <Tabs tabPosition="left" style={{minHeight: 200}}>
                  <Tabs.TabPane tab="普通间隔" key="interval">
                    <Form.Item required label="间隔时间(秒)" extra="每隔指定n秒执行一次。">
                      <InputNumber
                        style={{width: 150}}
                        placeholder="请输入"
                        value={args['interval']}
                        onChange={v => this.handleArgs('interval', v)}/>
                    </Form.Item>
                  </Tabs.TabPane>
                  <Tabs.TabPane tab="一次性" key="date">
                    <Form.Item required label="执行时间" extra="仅在指定时间运行一次。">
                      <DatePicker
                        showTime
                        disabledDate={v => v && v.format('YYYY-MM-DD') < moment().format('YYYY-MM-DD')}
                        style={{width: 150}}
                        placeholder="请选择执行时间"
                        onOk={() => false}
                        value={args['date'] ? moment(args['date']) : undefined}
                        onChange={v => this.handleArgs('date', v)}/>
                    </Form.Item>
                  </Tabs.TabPane>
                  <Tabs.TabPane disabled tab="UNIX Cron" key="cron">
                  </Tabs.TabPane>
                  <Tabs.TabPane disabled tab="日历间隔" key="calendarinterval">
                  </Tabs.TabPane>
                </Tabs>
              )}
            </Form.Item>
          </div>
          <Form.Item wrapperCol={{span: 14, offset: 6}}>
            {page === 2 &&
            <Button disabled={!b3} type="primary" onClick={this.handleSubmit} loading={loading}>提交</Button>}
            {page === 0 &&
            <Button disabled={!b1} type="primary" onClick={() => this.setState({page: page + 1})}>下一步</Button>}
            {page === 1 &&
            <Button disabled={!b2} type="primary" onClick={() => this.setState({page: page + 1})}>下一步</Button>}
            {page !== 0 &&
            <Button style={{marginLeft: 20}} onClick={() => this.setState({page: page - 1})}>上一步</Button>}
          </Form.Item>
        </Form>
        {showTmp && <TemplateSelector
          onOk={command => this.setState({command})}
          onCancel={() => this.setState({showTmp: false})}/>}
      </Modal>
    )
  }
}

export default Form.create()(ComForm)
