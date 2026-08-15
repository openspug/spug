/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Input, Select } from 'antd';
import { SearchForm, AuthDiv, Breadcrumb } from 'components';
import { t } from 'libs';
import ComTable from './Table';
import ComForm from './Form';
import store from './store';

export default observer(function () {
  return (
    <AuthDiv auth="exec.template.view">
      <Breadcrumb>
        <Breadcrumb.Item>{t('首页')}</Breadcrumb.Item>
        <Breadcrumb.Item>{t('批量执行')}</Breadcrumb.Item>
        <Breadcrumb.Item>{t('模版管理')}</Breadcrumb.Item>
      </Breadcrumb>
      <SearchForm>
        <SearchForm.Item span={8} title={t('模板类型')}>
          <Select allowClear value={store.f_type} onChange={v => store.f_type = v} placeholder={t('请选择')}>
            {store.types.map(item => (
              <Select.Option value={item} key={item}>{item}</Select.Option>
            ))}
          </Select>
        </SearchForm.Item>
        <SearchForm.Item span={8} title={t('模版名称')}>
          <Input allowClear value={store.f_name} onChange={e => store.f_name = e.target.value} placeholder={t('请输入')}/>
        </SearchForm.Item>
      </SearchForm>
      <ComTable/>
      {store.formVisible && <ComForm/>}
    </AuthDiv>
  );
})
