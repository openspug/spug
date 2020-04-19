/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Button, Select, DatePicker } from 'antd';
import { SearchForm, AuthDiv, AuthCard } from 'components';
import SelectApp from './SelectApp';
import Ext1Form from './Ext1Form';
import Ext2Form from './Ext2Form';
import Approve from './Approve';
import ComTable from './Table';
import envStore from 'pages/config/environment/store';
import appStore from 'pages/config/app/store'
import store from './store';

@observer
class Index extends React.Component {
  componentDidMount() {
    if (envStore.records.length === 0) {
      envStore.fetchRecords()
    }
    if (appStore.records.length === 0) {
      appStore.fetchRecords()
    }
  }

  render() {
    return (
      <AuthCard auth="deploy.request.view">
        <SearchForm>
          <SearchForm.Item span={6} title="发布环境">
            <Select allowClear onChange={v => store.f_env_id = v} placeholder="请选择">
              {envStore.records.map(item => (
                <Select.Option key={item.id} value={item.id}>{item.name}</Select.Option>
              ))}
            </Select>
          </SearchForm.Item>
          <SearchForm.Item span={6} title="应用名称">
            <Select allowClear onChange={v => store.f_app_id = v} placeholder="请选择">
              {appStore.records.map(item => (
                <Select.Option key={item.id} value={item.id}>{item.name}</Select.Option>
              ))}
            </Select>
          </SearchForm.Item>
          <SearchForm.Item span={8} title="申请时间">
            <DatePicker.RangePicker onChange={store.updateDate} />
          </SearchForm.Item>
          <SearchForm.Item span={4}>
            <Button type="primary" icon="sync" onClick={store.fetchRecords}>刷新</Button>
          </SearchForm.Item>
        </SearchForm>
        <AuthDiv auth="deploy.request.add" style={{marginBottom: 16}}>
          <Button type="primary" icon="plus" onClick={() => store.addVisible = true}>新建发布申请</Button>
        </AuthDiv>
        <ComTable/>
        {store.addVisible && <SelectApp/>}
        {store.ext1Visible && <Ext1Form/>}
        {store.ext2Visible && <Ext2Form/>}
        {store.approveVisible && <Approve/>}
      </AuthCard>
    )
  }
}

export default Index