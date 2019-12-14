import React from 'react';
import { observer } from 'mobx-react';
import { Link } from 'react-router-dom';
import { Switch, Col, Form, Input, Select, Button } from "antd";
import envStore from 'pages/config/environment/store';
import store from './store';

export default observer(function Ext2Setup1() {
  const info = store.record;
  return (
    <Form labelCol={{span: 6}} wrapperCol={{span: 14}}>
      <Form.Item required label="应用名称" help="相同应用不同环境，请保持应用名称相同，以便维护">
        <Input value={info.name} onChange={e => info.name = e.target.value} placeholder="请输入应用名称"/>
      </Form.Item>
      <Form.Item required label="发布环境">
        <Col span={16}>
          <Select value={info.env_id} onChange={v => info.env_id = v} placeholder="请选择发布环境">
            {envStore.records.map(item => (
              <Select.Option value={item.id} key={item.id}>{item.name}</Select.Option>
            ))}
          </Select>
        </Col>
        <Col span={6} offset={2}>
          <Link to="/config/environment">新建环境</Link>
        </Col>
      </Form.Item>
      <Form.Item label="发布审核">
        <Switch
          checkedChildren="开启"
          unCheckedChildren="关闭"
          checked={info['is_audit']}
          onChange={v => info['is_audit'] = v}/>
      </Form.Item>
      <Form.Item wrapperCol={{span: 14, offset: 6}}>
        <Button
          type="primary"
          disabled={!(info.name && info.env_id)}
          onClick={() => store.page += 1}>下一步</Button>
      </Form.Item>
    </Form>
  )
})
