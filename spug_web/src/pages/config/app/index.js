/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Input, Button } from 'antd';
import { SearchForm, AuthDiv, AuthCard } from 'components';
import ComTable from './Table';
import ComForm from './Form';
import Rel from './Rel';
import store from './store';

export default observer(function () {
  return (
    <AuthCard auth="config.app.view">
      <SearchForm>
        <SearchForm.Item span={8} title="应用名称">
          <Input allowClear onChange={e => store.f_name = e.target.value} placeholder="请输入"/>
        </SearchForm.Item>
        <SearchForm.Item span={8}>
          <Button type="primary" icon="sync" onClick={store.fetchRecords}>刷新</Button>
        </SearchForm.Item>
      </SearchForm>
      <AuthDiv auth="config.app.add" style={{marginBottom: 16}}>
        <Button type="primary" icon="plus" onClick={() => store.showForm()}>新建</Button>
      </AuthDiv>
      <ComTable/>
      {store.formVisible && <ComForm/>}
      {store.relVisible && <Rel />}
    </AuthCard>
  )
})
