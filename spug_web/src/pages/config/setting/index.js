/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Menu, Input, Button, PageHeader, Modal, Space, Radio, Form } from 'antd';
import {
  DiffOutlined,
  HistoryOutlined,
  NumberOutlined,
  TableOutlined,
  UnorderedListOutlined,
  PlusOutlined,
  EditOutlined,
  SaveOutlined
} from '@ant-design/icons';
import envStore from '../environment/store';
import styles from './index.module.less';
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
      view: '1',
      editable: false,
      loading: false,
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

  componentWillUnmount() {
    store.obj = {}
    store.records = []
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

  handleSubmit = () => {
    this.setState({loading: true})
    const ref = this.state.view === '2' ? this.textView : this.JSONView
    ref.handleSubmit()
      .then(() => this.setState({editable: false}))
      .finally(() => this.setState({loading: false}))
  }

  render() {
    const {view, editable, loading} = this.state;
    const isApp = store.type === 'app';
    return (
      <AuthDiv auth={`config.${store.type}.view_config`}>
        <Breadcrumb extra={(<Button type="primary" className={styles.historyBtn} icon={<HistoryOutlined/>}
                                    onClick={store.showRecord}>更改历史</Button>)}>
          <Breadcrumb.Item>首页</Breadcrumb.Item>
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
                {['2', '3'].includes(view) ? editable ? (
                  <Button
                    icon={<SaveOutlined/>}
                    type="primary"
                    loading={loading}
                    onClick={this.handleSubmit}>保存</Button>
                ) : (
                  <AuthButton
                    icon={<EditOutlined/>}
                    type="primary"
                    auth={`config.${store.type}.edit_config`}
                    onClick={() => this.setState({editable: true})}>编辑</AuthButton>
                ) : (
                  <AuthButton
                    auth="config.app.edit_config|config.service.edit_config"
                    disabled={view !== '1'}
                    type="primary"
                    icon={<PlusOutlined/>}
                    onClick={() => store.showForm()}>新增配置</AuthButton>
                )}

              </Space>
            </Form>

            {view === '1' && <TableView/>}
            {view === '2' && <TextView ref={ref => this.textView = ref} editable={editable}/>}
            {view === '3' && <JSONView ref={ref => this.JSONView = ref} editable={editable}/>}
          </div>
        </div>
        {store.recordVisible && <Record/>}
        {store.diffVisible && <DiffConfig/>}
      </AuthDiv>
    )
  }
}

export default Index
