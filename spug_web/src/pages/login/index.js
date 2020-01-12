import React from 'react';
import {Form, Input, Icon, Button, Tabs, Modal} from 'antd';
import styles from './login.module.css';
import history from 'libs/history';
import {http} from 'libs';
import logo from 'layout/logo.svg';

class LoginIndex extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      loginType: 'default'
    }
  }

  handleSubmit = () => {
    this.props.form.validateFields((err, formData) => {
      if (!err) {
        this.setState({loading: true});
        http.post('/api/account/login/', formData)
          .then(data => {
            if (!data['has_real_ip']) {
              Modal.warning({
                title: '安全警告',
                className: styles.tips,
                content: <div>
                  未能获取到客户端的真实IP，无法提供基于请求来源IP的合法性验证，详细信息请参考
                  <a target="_blank" href="https://spug.dev" rel="noopener noreferrer">官方文档</a>。
                </div>,
                onOk: () => this.doLogin(data)
              })
            } else {
              this.doLogin(data)
            }
          }, () => this.setState({loading: false}))
      }
    })
  };

  doLogin = (data) => {
    localStorage.setItem('token', data['access_token']);
    localStorage.setItem('nickname', data['nickname']);
    localStorage.setItem('is_supper', data['is_supper']);
    if (history.location.state && history.location.state['from']) {
      history.push(history.location.state['from'])
    } else {
      history.push('/home')
    }
  };

  render() {
    const {getFieldDecorator} = this.props.form;
    return (
      <div className={styles.container}>
        <div className={styles.titleContainer}>
          <div><img className={styles.logo} src={logo} alt="logo"/>Spug devops</div>
          <div className={styles.desc}>Open source O & M management system by openspug</div>
        </div>
        <div className={styles.formContainer}>
          <Tabs classNam={styles.tabs} onTabClick={e => this.setState({loginType: e})}>
            <Tabs.TabPane tab="普通登录" key="default"/>
            <Tabs.TabPane tab="LDAP登录" key="ldap"/>
          </Tabs>
          <Form>
            <Form.Item className={styles.formItem}>
              {getFieldDecorator('username', {rules: [{required: true, message: '请输入账户'}]})(
                <Input
                  size="large"
                  autoComplete="off"
                  placeholder="请输入账户"
                  prefix={<Icon type="user" className={styles.icon}/>}/>
              )}
            </Form.Item>
            <Form.Item className={styles.formItem}>
              {getFieldDecorator('password', {rules: [{required: true, message: '请输入密码'}]})(
                <Input
                  size="large"
                  type="password"
                  autoComplete="off"
                  placeholder="请输入密码"
                  onPressEnter={this.handleSubmit}
                  prefix={<Icon type="lock" className={styles.icon}/>}/>
              )}
            </Form.Item>
          </Form>

          <Button
            block
            size="large"
            type="primary"
            className={styles.button}
            loading={this.state.loading}
            onClick={this.handleSubmit}>登录</Button>
        </div>
        <div className={styles.footer}>
          Copyright <Icon type="copyright"/> 2019 By Open Spug
        </div>
      </div>
    )
  }
}

export default Form.create()(LoginIndex)