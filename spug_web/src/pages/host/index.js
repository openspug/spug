/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Input, Button, Select } from 'antd';
import { SearchForm, AuthDiv, AuthCard } from 'components';
import ComTable from './Table';
import Tags from './Tags';
import store from './store';

export default observer(function () {
  return (
    <AuthCard auth="host.host.view">
      <SearchForm>
        <SearchForm.Item span={6} title="主机类别">
          <Select allowClear placeholder="请选择" value={store.f_zone} onChange={v => store.f_zone = v}>
            {store.zones.map(item => (
              <Select.Option value={item} key={item}>{item}</Select.Option>
            ))}
          </Select>
        </SearchForm.Item>
        <SearchForm.Item span={6} title="主机别名">
          <Input allowClear value={store.f_name} onChange={e => store.f_name = e.target.value} placeholder="请输入"/>
        </SearchForm.Item>
        <SearchForm.Item span={6} title="连接地址">
          <Input allowClear value={store.f_host} onChange={e => store.f_host = e.target.value} placeholder="请输入"/>
        </SearchForm.Item>
        <SearchForm.Item span={6}>
          <Button type="primary" icon="sync" onClick={store.fetchRecords}>刷新</Button>
        </SearchForm.Item>
      </SearchForm>
      <SearchForm>
        <SearchForm.Item span={24}>
          <Tags/>
        </SearchForm.Item>
      </SearchForm>
      <AuthDiv auth="host.host.add" style={{marginBottom: 16}}>
        <Button type="primary" icon="plus" onClick={() => store.showForm()}>新建</Button>
        <Button style={{marginLeft: 20}} type="primary" icon="import"
                onClick={() => store.importVisible = true}>批量导入</Button>
      </AuthDiv>
      <ComTable/>
    </AuthCard>
  )
})
