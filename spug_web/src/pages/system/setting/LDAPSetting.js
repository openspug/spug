/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import styles from './index.module.css';
import {Button, Form, Input, message} from "antd";
import { http } from 'libs';
import { observer } from 'mobx-react'
import store from './store';
import lds from "lodash";


@observer
class LDAPSetting extends React.Component {
  constructor(props) {
    super(props);
    this.setting = JSON.parse(lds.get(store.settings, 'ldap_service.value', "{}"));
    this.state = {
      loading: false,
      ldap_test_loading: false,
    }
  }

  handleSubmit = () => {
    const formData = [];
    this.props.form.validateFields((err, data) => {
      if (!err) {
        this.setState({loading: true});
        formData.push({key: 'ldap_service', value: JSON.stringify(data)});
        http.post('/api/setting/', {data: formData})
          .then(() => {
            message.success('保存成功');
            store.fetchSettings()
          })
          .finally(() => this.setState({loading: false}))
      }
    })
  };
  ldapTest = () => {
    this.props.form.validateFields((error, data) => {
      if (!error) {
        this.setState({ldap_test_loading: true});
        http.post('/api/setting/ldap_test/', data).then(()=> {
          message.success('LDAP服务连接成功')
        }).finally(()=> this.setState({ldap_test_loading: false}))
      }
    })
  };

  render() {
    const {getFieldDecorator} = this.props.form;
    return (
      <React.Fragment>
        <div className={styles.title}>LDAP设置</div>
        <Form style={{maxWidth: 400}} labelCol={{span: 8}} wrapperCol={{span: 16}}>
          <Form.Item required label="LDAP服务地址">
            {getFieldDecorator('server', {initialValue: this.setting['server'],
              rules: [{required: true, message: '请输入LDAP服务地址'}]})(
              <Input placeholder="例如：ldap.spug.cc"/>
            )}
          </Form.Item>
          <Form.Item required label="LDAP服务端口">
            {getFieldDecorator('port', {initialValue: this.setting['port'],
              rules: [{required: true, message: '请输入LDAP服务端口'}]})(
              <Input placeholder="例如：389"/>
            )}
          </Form.Item>
          <Form.Item required label="管理员DN">
            {getFieldDecorator('admin_dn', {initialValue: this.setting['admin_dn'],
              rules: [{required: true, message: '请输入LDAP管理员DN'}]})(
              <Input placeholder="例如：cn=admin,dc=spug,dc=dev"/>
            )}
          </Form.Item>
          <Form.Item required label="管理员密码">
            {getFieldDecorator('password', {initialValue: this.setting['password'],
              rules: [{required: true, message: '请输入LDAP管理员密码'}]})(
              <Input.Password placeholder="请输入LDAP管理员密码"/>
            )}
          </Form.Item>
          <Form.Item required label="LDAP搜索规则">
            {getFieldDecorator('rules', {initialValue: this.setting['rules'],
              rules: [{required: true, message: '请输入LDAP搜索规则'}]})(
              <Input placeholder="例如：cn"/>
            )}
          </Form.Item>
          <Form.Item required label="基本DN">
            {getFieldDecorator('base_dn', {initialValue: this.setting['base_dn'],
              rules: [{required: true, message: '请输入LDAP基本DN'}]})(
              <Input placeholder="例如：dc=spug,dc=dev"/>
            )}
          </Form.Item>
          <Form.Item>
            <Button  type="danger" loading={this.state.ldap_test_loading} style={{ marginRight: '10px' }}
                     onClick={this.ldapTest}>测试LDAP</Button>
            <Button type="primary" loading={this.state.loading} onClick={this.handleSubmit}>保存设置</Button>
          </Form.Item>
        </Form>
      </React.Fragment>
    )
  }
}
export default Form.create()(LDAPSetting)
