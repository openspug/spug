/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Input, Button } from 'antd';
import { SearchForm, AuthDiv, AuthCard } from 'components';
import SelectApp from './SelectApp';
import Ext1Form from './Ext1Form';
import Ext2Form from './Ext2Form';
import Approve from './Approve';
import ComTable from './Table';
import store from './store';

export default observer(function () {
  return (
    <AuthCard auth="deploy.request.view">
      <SearchForm>
        <SearchForm.Item span={8} title="应用名称">
          <Input allowClear onChange={e => store.f_app_name = e.target.value} placeholder="请输入"/>
        </SearchForm.Item>
        <SearchForm.Item span={8} title="申请标题">
          <Input allowClear onChange={e => store.f_name = e.target.value} placeholder="请输入"/>
        </SearchForm.Item>
        <SearchForm.Item span={8}>
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
})
