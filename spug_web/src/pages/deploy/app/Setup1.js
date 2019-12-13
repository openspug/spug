import React from 'react';
import { observer } from 'mobx-react';
import { Link } from 'react-router-dom';
import { Switch, Col, Form, Input, Select, Button } from "antd";
import envStore from 'pages/config/environment/store';
import store from './store';

@observer
class Setup1 extends React.Component {
  update = (key, value) => {
    store.record[key] = value
  };

  render() {
    const info = store.record;
    const itemLayout = {
      labelCol: {span: 6},
      wrapperCol: {span: 14}
    };
    const itemTailLayout = {
      labelCol: {span: 6},
      wrapperCol: {span: 14, offset: 6}
    };
    return (
      <Form>
        <Form.Item {...itemLayout} required label="应用名称" help="相同应用不同环境，请保持应用名称相同，以便维护">
          <Input value={info.name} onChange={e => info.name = e.target.value} placeholder="请输入应用名称"/>
        </Form.Item>
        <Form.Item {...itemLayout} required label="发布环境">
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
        <Form.Item {...itemLayout} required label="Git仓库地址">
          <Input value={info['git_repo']} onChange={e => info['git_repo'] = e.target.value} placeholder="请输入Git仓库地址"/>
        </Form.Item>
        <Form.Item {...itemLayout} label="Tag/Branch">
          <Select value={info['git_type']} onChange={v => info['git_type'] = v}>
            <Select.Option value="branch">Branch（分支）</Select.Option>
            <Select.Option value="tag">Tag（标签 / 版本）</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item {...itemLayout} label="发布审核">
          <Switch
            checkedChildren="开启"
            unCheckedChildren="关闭"
            checked={info['is_audit']}
            onChange={v => info['is_audit'] = v}/>
        </Form.Item>
        <Form.Item {...itemTailLayout}>
          <Button
            type="primary"
            disabled={!(info.name && info.env_id && info['git_repo'])}
            onClick={() => store.page += 1}>下一步</Button>
        </Form.Item>
      </Form>
    )
  }
}

export default Form.create()(Setup1)