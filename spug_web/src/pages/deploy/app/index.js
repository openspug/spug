import React from 'react';
import { observer } from 'mobx-react';
import { Card, Input, Button } from 'antd';
import { SearchForm } from 'components';
import ComTable from './Table';
import Ext1Form from './Ext1Form';
import Ext2Form from './Ext2Form';
import AddSelect from './AddSelect';
import store from './store';

export default observer(function () {
  return (
    <Card>
      <SearchForm>
        <SearchForm.Item span={8} title="任务名称">
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
      {store.addVisible && <AddSelect />}
      {store.ext1Visible &&  <Ext1Form />}
      {store.ext2Visible &&  <Ext2Form />}
    </Card>
  )
})