import React from 'react';
import { Card, Input, Select, Button } from 'antd';
import { SearchForm } from 'components';
import ComTable from './Table';
import store from './store';

export default function () {
  return (
    <Card>
      <SearchForm>
        <SearchForm.Item span={8} title="任务名称">
          <Input onChange={e => store.f_name = e.target.value} placeholder="请输入"/>
        </SearchForm.Item>
        <SearchForm.Item span={8} title="任务状态">
          <Select allowClear onChange={v => store.f_status = v} placeholder="请选择">
            <Select.Option value="true">正常</Select.Option>
            <Select.Option value="false">禁用</Select.Option>
          </Select>
        </SearchForm.Item>
        <SearchForm.Item span={8}>
          <Button type="primary" icon="sync" onClick={store.fetchRecords}>刷新</Button>
        </SearchForm.Item>
      </SearchForm>
      <div style={{marginBottom: 16}}>
        <Button type="primary" icon="plus" onClick={() => store.showForm()}>新建</Button>
      </div>
      <ComTable/>
    </Card>
  )
}