/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Form, Select, Button, Icon } from "antd";
import store from './store';
import hostStore from 'pages/host/store';
import styles from './index.module.css';

@observer
class Ext2Setup2 extends React.Component {
  componentDidMount() {
    if (hostStore.records.length === 0) {
      hostStore.fetchRecords()
    }
  }

  render() {
    const info = store.deploy;
    return (
      <Form labelCol={{span: 6}} wrapperCol={{span: 14}}>
        <Form.Item required label="发布目标主机">
          {info['host_ids'].map((id, index) => (
            <React.Fragment key={index}>
              <Select
                value={id}
                placeholder="请选择"
                style={{width: '80%', marginRight: 10}}
                onChange={v => store.editHost(index, v)}>
                {hostStore.records.map(item => (
                  <Select.Option key={item.id} value={item.id} disabled={info['host_ids'].includes(item.id)}>
                    {item.name}({item['hostname']}:{item['port']})
                  </Select.Option>
                ))}
              </Select>
              {info['host_ids'].length > 1 && (
                <Icon className={styles.delIcon} type="minus-circle-o" onClick={() => store.delHost(index)}/>
              )}
            </React.Fragment>
          ))}
        </Form.Item>
        <Form.Item wrapperCol={{span: 14, offset: 6}}>
          <Button type="dashed" style={{width: '80%'}} onClick={store.addHost}>
            <Icon type="plus"/>添加目标主机
          </Button>
        </Form.Item>
        <Form.Item wrapperCol={{span: 14, offset: 6}}>
          <Button disabled={info['host_ids'].filter(x => x).length === 0} type="primary"
                  onClick={() => store.page += 1}>下一步</Button>
          <Button style={{marginLeft: 20}} onClick={() => store.page -= 1}>上一步</Button>
        </Form.Item>
      </Form>
    )
  }
}

export default Ext2Setup2
