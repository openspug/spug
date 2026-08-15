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
    <AuthDiv auth="system.account.view">
      <Breadcrumb>
        <Breadcrumb.Item>{t('首页')}</Breadcrumb.Item>
        <Breadcrumb.Item>{t('系统管理')}</Breadcrumb.Item>
        <Breadcrumb.Item>{t('凭据管理')}</Breadcrumb.Item>
      </Breadcrumb>
      <SearchForm>
        <SearchForm.Item span={8} title={t('凭据名称')}>
          <Input allowClear value={store.f_name} onChange={e => store.f_name = e.target.value} placeholder={t('请输入')}/>
        </SearchForm.Item>
        <SearchForm.Item span={8} title={t('可共享')}>
          <Select allowClear value={store.f_is_public} onChange={v => store.f_is_public = v} placeholder={t('请选择')}>
            <Select.Option value={true}>{t('开启')}</Select.Option>
            <Select.Option value={false}>{t('关闭')}</Select.Option>
          </Select>
        </SearchForm.Item>
      </SearchForm>
      <ComTable/>
      {store.formVisible && <ComForm/>}
    </AuthDiv>
  )
})
