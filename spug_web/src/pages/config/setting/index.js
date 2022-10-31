/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Menu, Input, Button, PageHeader, Modal, Space, Radio, Form, Alert } from 'antd';
import {
  DiffOutlined,
  HistoryOutlined,
  NumberOutlined,
  TableOutlined,
  UnorderedListOutlined,
  PlusOutlined
} from '@ant-design/icons';
import envStore from '../environment/store';
import styles from './index.module.css';
import history from 'libs/history';
import { AuthDiv, AuthButton, Breadcrumb } from 'components';
import DiffConfig from './DiffConfig';
import TableView from './TableView';
import TextView from './TextView';
import JSONView from './JSONView';
import Record from './Record';
import store from './store';

@observer
class Index extends React.Component {
  constructor(props) {
    super(props);
    this.textView = null;
    this.JSONView = null;
    this.state = {
      view: '1'
    }
  }

  componentDidMount() {
    const {type, id} = this.props.match.params;
    store.initial(type, id)
      .then(() => {
        if (envStore.records.length === 0) {
          envStore.fetchRecords().then(() => {
            if (envStore.records.length === 0) {
              Modal.error({
                title: '无可用环境',
                content: <div>配置依赖应用的运行环境，请在 <a href="/config/environment">环境管理</a> 中创建环境。</div>
              })
            } else {
              this.updateEnv()
            }
          })
        } else {
          this.updateEnv()
        }
      })
  }

  updateEnv = (env) => {
    store.env = env || envStore.records[0] || {};
    this.handleRefresh()
  };

  handleRefresh = () => {
    store.fetchRecords().then(() => {
      if (this.textView) this.textView.updateValue();
      if (this.JSONView) this.JSONView.updateValue();
    })
  };

  render() {
    const {view} = this.state;
    const isApp = store.type === 'app';
    return (
      <AuthDiv auth={`config.${store.type}.view_config`}>
        <Breadcrumb extra={<Alert message="4.0将移除公共/私有配置概念，所有配置将被视为公共配置。" banner/>}>
          <Breadcrumb.Item>配置中心</Breadcrumb.Item>
          <Breadcrumb.Item onClick={() => history.goBack()}>{isApp ? '应用配置' : '服务配置'}</Breadcrumb.Item>
          <Breadcrumb.Item>{store.obj.name}</Breadcrumb.Item>
        </Breadcrumb>
        <div className={styles.container}>
          <div className={styles.left}>
            <PageHeader
              title="环境列表"
              style={{padding: '0 0 10px 10px'}}
              onBack={() => history.goBack()}
              extra={<Button type="link" icon={<DiffOutlined/>} onClick={store.showDiff}>对比配置</Button>}/>
            <Menu
              mode="inline"
              selectedKeys={[String(store.env.id)]}
              style={{border: 'none'}}
              onSelect={({item}) => this.updateEnv(item.props.env)}>
              {envStore.records.map(item => (
                <Menu.Item key={item.id} env={item}>{item.name} ({item.key})</Menu.Item>
              ))}
            </Menu>
          </div>
          <div className={styles.right}>
            <Form layout="inline" style={{marginBottom: 16}}>
              <Form.Item label="视图" style={{paddingLeft: 0}}>
                <Radio.Group value={view} onChange={e => this.setState({view: e.target.value})}>
                  <Radio.Button value="1"><TableOutlined title="表格视图"/></Radio.Button>
                  <Radio.Button value="2"><UnorderedListOutlined title="文本视图"/></Radio.Button>
                  <Radio.Button value="3"><NumberOutlined title="JSON视图"/></Radio.Button>
                </Radio.Group>
              </Form.Item>
              <Form.Item label="Key">
                <Input allowClear value={store.f_name} onChange={e => store.f_name = e.target.value}
                       placeholder="请输入"/>
              </Form.Item>
              <Space style={{flex: 1, justifyContent: 'flex-end'}}>
                <AuthButton
                  auth="config.app.edit_config|config.service.edit_config"
                  disabled={view !== '1'}
                  type="primary"
                  icon={<PlusOutlined/>}
                  onClick={() => store.showForm()}>新增配置</AuthButton>
                <Button
                  type="primary"
                  style={{backgroundColor: 'orange', borderColor: 'orange'}}
                  icon={<HistoryOutlined/>}
                  onClick={store.showRecord}>更改历史</Button>
              </Space>
            </Form>

            {view === '1' && <TableView/>}
            {view === '2' && <TextView ref={ref => this.textView = ref}/>}
            {view === '3' && <JSONView ref={ref => this.JSONView = ref}/>}
          </div>
        </div>
        {store.recordVisible && <Record/>}
        {store.diffVisible && <DiffConfig/>}
      </AuthDiv>
    )
  }
}

export default Index
