/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { Input, Select, Button } from 'antd';
import { SearchForm, AuthDiv, AuthCard } from 'components';
import ComTable from './Table';
import store from './store';

export default function () {
  return (
    <AuthCard auth="monitor.monitor.view">
      <SearchForm>
        <SearchForm.Item span={8} title="任务名称">
          <Input allowClear onChange={e => store.f_name = e.target.value} placeholder="请输入"/>
        </SearchForm.Item>
        <SearchForm.Item span={8} title="任务状态">
          <Select allowClear onChange={v => store.f_status = v} placeholder="请选择">
            <Select.Option value={-3}>未激活</Select.Option>
            <Select.Option value={-2}>已激活</Select.Option>
            <Select.Option value={-1}>待检测</Select.Option>
            <Select.Option value={0}>正常</Select.Option>
            <Select.Option value={1}>异常</Select.Option>
          </Select>
        </SearchForm.Item>
        <SearchForm.Item span={8}>
          <Button type="primary" icon="sync" onClick={store.fetchRecords}>刷新</Button>
        </SearchForm.Item>
      </SearchForm>
      <AuthDiv auth="monitor.monitor.add" style={{marginBottom: 16}}>
        <Button type="primary" icon="plus" onClick={() => store.showForm()}>新建</Button>
      </AuthDiv>
      <ComTable/>
    </AuthCard>
  )
}
