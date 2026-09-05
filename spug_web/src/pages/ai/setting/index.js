/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useEffect } from 'react';
import { observer } from 'mobx-react';
import { Input, Tabs } from 'antd';
import { SearchForm, AuthDiv, Breadcrumb } from 'components';
import { hasPermission, t } from 'libs';
import McpTable from './McpTable';
import McpForm from './McpForm';
import SkillTable from './SkillTable';
import SkillForm from './SkillForm';
import store from './store';

export default observer(function () {
  useEffect(() => {
    if (hasPermission('ai.mcp.view')) store.fetchMcpRecords();
    if (hasPermission('ai.skill.view')) store.fetchSkillRecords();
    if (!hasPermission('ai.mcp.view')) store.tab = 'skill'
  }, [])

  const items = [];
  if (hasPermission('ai.mcp.view')) {
    items.push({key: 'mcp', label: t('MCP管理'), children: <McpTable/>})
  }
  if (hasPermission('ai.skill.view')) {
    items.push({key: 'skill', label: t('技能管理'), children: <SkillTable/>})
  }

  return (
    <AuthDiv auth="ai.mcp.view|ai.skill.view">
      <Breadcrumb>
        <Breadcrumb.Item>{t('首页')}</Breadcrumb.Item>
        <Breadcrumb.Item>{t('智能体')}</Breadcrumb.Item>
        <Breadcrumb.Item>{t('扩展管理')}</Breadcrumb.Item>
      </Breadcrumb>
      <SearchForm>
        <SearchForm.Item span={8} title={t('名称')}>
          <Input allowClear value={store.f_name} onChange={e => store.f_name = e.target.value}
                 placeholder={t('请输入')}/>
        </SearchForm.Item>
      </SearchForm>
      <Tabs activeKey={store.tab} onChange={v => store.tab = v} items={items}/>
      {store.mcpFormVisible && <McpForm/>}
      {store.skillFormVisible && <SkillForm/>}
    </AuthDiv>
  );
})
