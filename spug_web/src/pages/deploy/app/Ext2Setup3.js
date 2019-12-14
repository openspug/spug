import React from 'react';
import { observer } from 'mobx-react';
import { Form, Input, message, Button, Icon } from 'antd';
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
    http.post('/api/app/', {extend: '2', actions: store.actions})
      .then(res => {
        message.success('保存成功');
        store.ext2Visible = false;
        store.fetchRecords()
      }, () => this.setState({loading: false}))
  };

  render() {
    return (
      <Form labelCol={{span: 6}} wrapperCol={{span: 14}} className={styles.ext2Form}>
        {store.actions.map((item, index) => (
          <div key={index} style={{marginBottom: 30, position: 'relative'}}>
            <Form.Item required label={`动作${index + 1}`}>
              <Input value={item['title']} onChange={e => item['title'] = e.target.value} placeholder="请输入"/>
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
            {store.actions.length > 1 && (
              <div className={styles.delAction} onClick={() => store.actions.splice(index, 1)}><Icon
                type="minus-circle"/>移除</div>
            )}
          </div>
        ))}
        <Form.Item wrapperCol={{span: 14, offset: 6}}>
          <Button type="dashed" block onClick={() => store.actions.push({})}>
            <Icon type="plus"/>添加执行动作
          </Button>
        </Form.Item>
        <Form.Item wrapperCol={{span: 14, offset: 6}}>
          <Button
            type="primary"
            disabled={store.actions.filter(x => x.title && x.data).length === 0}
            loading={this.state.loading}
            onClick={this.handleSubmit}>提交</Button>
          <Button style={{marginLeft: 20}} onClick={() => store.page -= 1}>上一步</Button>
        </Form.Item>
      </Form>
    )
  }
}

export default Ext2Setup3