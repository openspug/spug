/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Form, Select, Button } from 'antd';
import HostSelector from 'pages/host/Selector';
import store from './store';
import hostStore from 'pages/host/store';
import styles from './index.module.css';

export default observer(function () {
  function handleChange(ids) {
    if (store.targets.includes('local')) {
      ids.unshift('local')
    }
    store.targets = ids
  }

  return (
    <React.Fragment>
      <Form labelCol={{span: 7}} wrapperCol={{span: 14}} style={{minHeight: 350}}>
        <Form.Item required label="执行对象">
          {store.targets.map((id, index) => (
            <React.Fragment key={index}>
              <Select
                value={id}
                showSearch
                placeholder="请选择"
                optionFilterProp="children"
                style={{width: '80%', marginRight: 10, marginBottom: 12}}
                filterOption={(input, option) => option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
                onChange={v => store.editTarget(index, v)}>
                <Select.Option value="local" disabled={store.targets.includes('local')}>本机</Select.Option>
                {hostStore.rawRecords.map(item => (
                  <Select.Option key={item.id} value={item.id} disabled={store.targets.includes(item.id)}>
                    {`${item.name}(${item['hostname']}:${item['port']})`}
                  </Select.Option>
                ))}
              </Select>
              {store.targets.length > 1 && (
                <MinusCircleOutlined className={styles.delIcon} onClick={() => store.delTarget(index)}/>
              )}
            </React.Fragment>
          ))}
        </Form.Item>
        <Form.Item wrapperCol={{span: 14, offset: 6}}>
          <HostSelector value={store.targets.filter(x => x !== 'local')} onChange={handleChange}>
            <Button type="dashed" style={{width: '80%'}}><PlusOutlined/>添加执行对象</Button>
          </HostSelector>
        </Form.Item>
      </Form>
      <Form.Item wrapperCol={{span: 14, offset: 6}}>
        <Button disabled={store.targets.filter(x => x).length === 0} type="primary"
                onClick={() => store.page += 1}>下一步</Button>
        <Button style={{marginLeft: 20}} onClick={() => store.page -= 1}>上一步</Button>
      </Form.Item>
    </React.Fragment>
  )
})
