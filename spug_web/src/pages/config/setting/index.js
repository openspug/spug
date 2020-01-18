/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Menu, Input, Button, Select, PageHeader, Icon } from 'antd';
import envStore from '../environment/store';
import styles from './index.module.css';
import history from 'libs/history';
import { SearchForm, AuthDiv, AuthButton } from 'components';
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
    store.type = type;
    store.id = id;
    if (envStore.records.length === 0) {
      envStore.fetchRecords().then(() => this.updateEnv())
    } else {
      this.updateEnv()
    }
  }

  updateEnv = (env) => {
    store.env = env || envStore.records[0];
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
    return (
      <AuthDiv auth={`config.${store.type}.view_config`} className={styles.container}>
        <div className={styles.left}>
          <PageHeader
            title="环境列表"
            style={{padding: '0 0 10px 10px'}}
            onBack={() => history.goBack()}
            extra={<Button type="link" icon="diff" onClick={store.showDiff}>对比配置</Button>}/>
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
          <SearchForm>
            <SearchForm.Item span={6} title="视图">
              <Select value={view} style={{width: '100%'}} onChange={v => this.setState({view: v})}>
                <Select.Option value="1"><Icon type="table" style={{marginRight: 10}}/>表格</Select.Option>
                <Select.Option value="2"><Icon type="unordered-list" style={{marginRight: 10}}/>文本</Select.Option>
                <Select.Option value="3"><Icon type="number" style={{marginRight: 10}}/>JSON</Select.Option>
              </Select>
            </SearchForm.Item>
            <SearchForm.Item span={7} title="Key">
              <Input allowClear onChange={e => store.f_name = e.target.value} placeholder="请输入"/>
            </SearchForm.Item>
            <SearchForm.Item span={3}>
              <Button type="primary" icon="sync" onClick={this.handleRefresh}>刷新</Button>
            </SearchForm.Item>
            <SearchForm.Item span={4}>
              <Button type="primary" style={{backgroundColor: 'orange', borderColor: 'orange'}} icon="history"
                      onClick={store.showRecord}>更改历史</Button>
            </SearchForm.Item>
            <SearchForm.Item span={4} style={{textAlign: 'right'}}>
              <AuthButton auth="config.app.edit_config|config.service.edit_config" disabled={view !== '1'} type="primary" icon="plus" onClick={() => store.showForm()}>新增配置</AuthButton>
            </SearchForm.Item>
          </SearchForm>

          {view === '1' && <TableView/>}
          {view === '2' && <TextView ref={ref => this.textView = ref}/>}
          {view === '3' && <JSONView ref={ref => this.JSONView = ref}/>}
        </div>
        {store.recordVisible && <Record/>}
        {store.diffVisible && <DiffConfig/>}
      </AuthDiv>
    )
  }
}

export default Index
