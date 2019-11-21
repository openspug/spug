import React from 'react';
import { observer } from 'mobx-react';
import { Card, Input, Button, Select } from 'antd';
import { SearchForm } from 'components';
import ComTable from './Table';
import store from './store';

export default observer(function () {
  return (
    <Card>
      <SearchForm>
        <SearchForm.Item span={8} title="主机类别">
          <Select allowClear placeholder="请选择" value={store.f_zone} onChange={v => store.f_zone = v}>
            {store.zones.map(item => (
              <Select.Option value={item} key={item}>{item}</Select.Option>
            ))}
          </Select>
        </SearchForm.Item>
        <SearchForm.Item span={8} title="主机别名">
          <Input allowClear value={store.f_name} onChange={e => store.f_name = e.target.value} placeholder="请输入"/>
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
})