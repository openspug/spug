/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Input, Select } from 'antd';
import { SearchForm, AuthDiv, Breadcrumb } from 'components';
import ComTable from './Table';
import Info from './Info';
import Record from './Record';
import ComForm from './Form';
import store from './store';

export default observer(function () {
  return (
    <AuthDiv auth="schedule.schedule.view">
      <Breadcrumb>
        <Breadcrumb.Item>首页</Breadcrumb.Item>
        <Breadcrumb.Item>任务计划</Breadcrumb.Item>
      </Breadcrumb>
      <SearchForm>
        <SearchForm.Item span={6} title="状态">
          <Select allowClear value={store.f_status} onChange={v => store.f_status = v} placeholder="请选择">
            <Select.Option value={-1}>待调度</Select.Option>
            <Select.Option value={0}>执行中</Select.Option>
            <Select.Option value={1}>成功</Select.Option>
            <Select.Option value={2}>失败</Select.Option>
          </Select>
        </SearchForm.Item>
        <SearchForm.Item span={6} title="类型">
          <Select allowClear value={store.f_type} onChange={v => store.f_type = v} placeholder="请选择">
            {store.types.map(item => (
              <Select.Option value={item} key={item}>{item}</Select.Option>
            ))}
          </Select>
        </SearchForm.Item>
        <SearchForm.Item span={6} title="名称">
          <Input allowClear value={store.f_name} onChange={e => store.f_name = e.target.value} placeholder="请输入"/>
        </SearchForm.Item>
      </SearchForm>
      <ComTable/>
      {store.formVisible && <ComForm/>}
      {store.infoVisible && <Info/>}
      {store.recordVisible && <Record/>}
    </AuthDiv>
  )
})
