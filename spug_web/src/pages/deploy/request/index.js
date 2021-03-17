/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { ExclamationCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import { Form, Select, DatePicker, Modal, Input, Row, Col, message } from 'antd';
import { SearchForm, AuthDiv, AuthButton, Breadcrumb, AppSelector } from 'components';
import Ext1Form from './Ext1Form';
import Ext2Form from './Ext2Form';
import Approve from './Approve';
import ComTable from './Table';
import Ext1Console from './Ext1Console';
import { http, includes } from 'libs';
import envStore from 'pages/config/environment/store';
import appStore from 'pages/config/app/store';
import store from './store';
import moment from 'moment';
import styles from './index.module.less';

function Index() {
  const [expire, setExpire] = useState();
  const [count, setCount] = useState();

  useEffect(() => {
    store.fetchRecords()
    if (envStore.records.length === 0) envStore.fetchRecords()
    if (appStore.records.length === 0) appStore.fetchRecords()
  }, [])

  function handleBatchDel() {
    Modal.confirm({
      icon: <ExclamationCircleOutlined/>,
      title: '批量删除发布申请',
      content: (
        <Form layout="vertical" style={{marginTop: 24}}>
          <Form.Item label="截止日期 :" help={<div>将删除截止日期<span style={{color: 'red'}}>之前</span>的所有发布申请记录。</div>}>
            <DatePicker style={{width: 200}} placeholder="请输入"
                        onChange={val => setExpire(val.format('YYYY-MM-DD'))}/>
          </Form.Item>
          <Form.Item label="保留记录 :" help="每个应用每个环境仅保留最新的N条发布申请，优先级高于截止日期">
            <Input allowClear style={{width: 200}} placeholder="请输入保留个数"
                   onChange={e => setCount(e.target.value)}/>
          </Form.Item>
        </Form>
      ),
      onOk: () => {
        return http.delete('/api/deploy/request/', {params: {expire, count}})
          .then(res => {
            message.success(`成功删除${res}条记录`);
            store.fetchRecords()
          })
      },
    })
  }

  return (
    <AuthDiv auth="deploy.request.view">
      <Breadcrumb>
        <Breadcrumb.Item>首页</Breadcrumb.Item>
        <Breadcrumb.Item>应用发布</Breadcrumb.Item>
        <Breadcrumb.Item>发布申请</Breadcrumb.Item>
      </Breadcrumb>
      <SearchForm>
        <SearchForm.Item span={6} title="发布环境">
          <Select
            allowClear
            showSearch
            value={store.f_env_id}
            filterOption={(i, o) => includes(o.children, i)}
            onChange={v => store.f_env_id = v}
            placeholder="请选择">
            {envStore.records.map(item => (
              <Select.Option key={item.id} value={item.id}>{item.name}</Select.Option>
            ))}
          </Select>
        </SearchForm.Item>
        <SearchForm.Item span={6} title="应用名称">
          <Select
            allowClear
            showSearch
            value={store.f_app_id}
            filterOption={(i, o) => includes(o.children, i)}
            onChange={v => store.f_app_id = v}
            placeholder="请选择">
            {appStore.records.map(item => (
              <Select.Option key={item.id} value={item.id}>{item.name}</Select.Option>
            ))}
          </Select>
        </SearchForm.Item>
        <SearchForm.Item span={8} title="申请时间">
          <DatePicker.RangePicker
            value={store.f_s_date ? [moment(store.f_s_date), moment(store.f_e_date)] : undefined}
            onChange={store.updateDate}/>
        </SearchForm.Item>
        <SearchForm.Item span={4} style={{textAlign: 'right'}}>
          <AuthButton
            auth="deploy.request.del"
            type="danger"
            icon={<DeleteOutlined/>}
            onClick={handleBatchDel}>批量删除</AuthButton>
        </SearchForm.Item>
      </SearchForm>
      <ComTable/>
      <AppSelector
        visible={store.addVisible}
        onCancel={() => store.addVisible = false}
        onSelect={store.confirmAdd}/>
      {store.ext1Visible && <Ext1Form/>}
      {store.ext2Visible && <Ext2Form/>}
      {store.approveVisible && <Approve/>}
      {store.tabs.length > 0 && (
        <Row gutter={12} className={styles.miniConsole}>
          {store.tabs.map(item => (
            <Col key={item.id}>
              <Ext1Console request={item}/>
            </Col>
          ))}
        </Row>
      )}
      <div ref={el => store.box = el} id='floatBox' className={styles.floatBox}/>
    </AuthDiv>
  )
}

export default observer(Index)