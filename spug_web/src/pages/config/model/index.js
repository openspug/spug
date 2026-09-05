/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useEffect } from 'react';
import { observer } from 'mobx-react';
import { Input } from 'antd';
import { SearchForm, AuthDiv, Breadcrumb } from 'components';
import { t } from 'libs';
import ComTable from './Table';
import ComForm from './Form';
import store from './store';

export default observer(function () {
  useEffect(() => {
    store.fetchRecords()
  }, [])

  return (
    <AuthDiv auth="config.model.view">
      <Breadcrumb>
        <Breadcrumb.Item>{t('首页')}</Breadcrumb.Item>
        <Breadcrumb.Item>{t('配置中心')}</Breadcrumb.Item>
        <Breadcrumb.Item>{t('模型配置')}</Breadcrumb.Item>
      </Breadcrumb>
      <SearchForm>
        <SearchForm.Item span={8} title={t('配置名称')}>
          <Input allowClear value={store.f_name} onChange={e => store.f_name = e.target.value}
                 placeholder={t('请输入')}/>
        </SearchForm.Item>
      </SearchForm>
      <ComTable/>
      {store.formVisible && <ComForm/>}
    </AuthDiv>
  );
})
