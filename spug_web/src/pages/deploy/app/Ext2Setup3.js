import React from 'react';
import { observer } from 'mobx-react';
import { Form, Input, Button, message, Col, Radio, Icon } from 'antd';
import Editor from 'react-ace';
import 'ace-builds/src-noconflict/mode-sh';
import 'ace-builds/src-noconflict/theme-tomorrow';
import styles from './index.module.css';
import http from 'libs/http';
import store from './store';

@observer
class Ext2Setup3 extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
    }
  }

  handleSubmit = () => {
    this.setState({loading: true});
    store.record['extend'] = '2';
    store.record['actions'] = store.record['actions'].filter(x => x.title && x.data);
    http.post('/api/app/', store.record)
      .then(res => {
        message.success('保存成功');
        store.ext2Visible = false;
        store.fetchRecords()
      }, () => this.setState({loading: false}))
  };

  render() {
    const actions = store.record['actions'];
    return (
      <Form labelCol={{span: 6}} wrapperCol={{span: 14}} className={styles.ext2Form}>
        {actions.map((item, index) => (
          <div key={index} style={{marginBottom: 30, position: 'relative'}}>
            <Form.Item required label={`动作${index + 1}`}>
              <Col span={9}>
                <Input value={item['title']} onChange={e => item['title'] = e.target.value} placeholder="请输入"/>
              </Col>
              <Col span={15}>
                <Form.Item labelCol={{span: 6}} wrapperCol={{span: 18}} label="目标">
                  <Radio.Group value={item['target']} onChange={e => item['target'] = e.target.value}>
                    <Radio value="server">服务本机</Radio>
                    <Radio value="host">目标主机</Radio>
                  </Radio.Group>
                </Form.Item>
              </Col>
            </Form.Item>

            <Form.Item required label="执行内容">
              <Editor
                mode="sh"
                theme="tomorrow"
                width="100%"
                height="100px"
                value={item['data']}
                onChange={v => item['data'] = v}
                placeholder="请输入要执行的动作"/>
            </Form.Item>
            {actions.length > 1 && (
              <div className={styles.delAction} onClick={() => actions.splice(index, 1)}><Icon
                type="minus-circle"/>移除</div>
            )}
          </div>
        ))}
        <Form.Item wrapperCol={{span: 14, offset: 6}}>
          <Button type="dashed" block onClick={() => actions.push({target: 'server'})}>
            <Icon type="plus"/>添加执行动作
          </Button>
        </Form.Item>
        <Form.Item wrapperCol={{span: 14, offset: 6}}>
          <Button
            type="primary"
            disabled={actions.filter(x => x.title && x.data).length === 0}
            loading={this.state.loading}
            onClick={this.handleSubmit}>提交</Button>
          <Button style={{marginLeft: 20}} onClick={() => store.page -= 1}>上一步</Button>
        </Form.Item>
      </Form>
    )
  }
}

export default Ext2Setup3