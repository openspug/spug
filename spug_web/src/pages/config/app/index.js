import React from 'react';
import { observer } from 'mobx-react';
import { Card, Input, Button } from 'antd';
import { SearchForm } from 'components';
import ComTable from './Table';
import ComForm from './Form';
import Rel from './Rel';
import store from './store';

export default observer(function () {
  return (
    <Card>
      <SearchForm>
        <SearchForm.Item span={8} title="应用名称">
          <Input allowClear onChange={e => store.f_name = e.target.value} placeholder="请输入"/>
        </SearchForm.Item>
        <SearchForm.Item span={8}>
          <Button type="primary" icon="sync" onClick={store.fetchRecords}>刷新</Button>
        </SearchForm.Item>
      </SearchForm>
      <div style={{marginBottom: 16}}>
        <Button type="primary" icon="plus" onClick={() => store.showForm()}>新建</Button>
      </div>
      <ComTable/>
      {store.formVisible && <ComForm/>}
      {store.relVisible && <Rel />}
    </Card>
  )
})