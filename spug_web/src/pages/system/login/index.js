/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Input } from 'antd';
import { SearchForm, AuthDiv, Breadcrumb } from 'components';
import ComTable from './Table';
import store from './store';

export default observer(function () {
  return (
    <AuthDiv auth="system.account.view">
      <Breadcrumb>
        <Breadcrumb.Item>首页</Breadcrumb.Item>
        <Breadcrumb.Item>系统管理</Breadcrumb.Item>
        <Breadcrumb.Item>账户管理</Breadcrumb.Item>
      </Breadcrumb>
      <SearchForm>
        <SearchForm.Item span={8} title="账户名称">
          <Input allowClear value={store.f_name} onChange={e => store.f_name = e.target.value} placeholder="请输入"/>
        </SearchForm.Item>
        <SearchForm.Item span={8} title="登录IP">
          <Input allowClear value={store.f_ip} onChange={e => store.f_ip = e.target.value} placeholder="请输入"/>
        </SearchForm.Item>
      </SearchForm>
      <ComTable/>
    </AuthDiv>
  )
})
