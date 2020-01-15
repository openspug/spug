/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Input, Select, Button } from 'antd';
import { SearchForm, AuthDiv, AuthCard } from 'components';
import ComTable from './Table';
import store from './store';

export default observer(function () {
  return (
    <AuthCard auth="schedule.schedule.view">
      <SearchForm>
        <SearchForm.Item span={6} title="状态">
          <Select allowClear onChange={v => store.f_status = v} placeholder="请选择">
            <Select.Option value={-3}>未激活</Select.Option>
            <Select.Option value={-2}>已激活</Select.Option>
            <Select.Option value={-1}>待调度</Select.Option>
            <Select.Option value={0}>成功</Select.Option>
            <Select.Option value={1}>异常</Select.Option>
            <Select.Option value={2}>失败</Select.Option>
          </Select>
        </SearchForm.Item>
        <SearchForm.Item span={6} title="类型">
          <Select allowClear onChange={v => store.f_type = v} placeholder="请选择">
            {store.types.map(item => (
              <Select.Option value={item} key={item}>{item}</Select.Option>
            ))}
          </Select>
        </SearchForm.Item>
        <SearchForm.Item span={6} title="名称">
          <Input allowClear onChange={e => store.f_name = e.target.value} placeholder="请输入"/>
        </SearchForm.Item>
        <SearchForm.Item span={6}>
          <Button type="primary" icon="sync" onClick={store.fetchRecords}>刷新</Button>
        </SearchForm.Item>
      </SearchForm>
      <AuthDiv auth="schedule.schedule.add" style={{marginBottom: 16}}>
        <Button type="primary" icon="plus" onClick={() => store.showForm()}>新建</Button>
      </AuthDiv>
      <ComTable/>
    </AuthCard>
  )
})
