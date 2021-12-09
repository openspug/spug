/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Button, message } from 'antd';
import { SaveOutlined, EditOutlined } from '@ant-design/icons';
import { ACEditor } from 'components';
import store from './store';
import { http } from 'libs';


import { AuthButton } from 'components';

@observer
class TextView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      readOnly: true,
      body: ''
    }
  }

  componentDidMount() {
    this.updateValue()
  }

  updateValue = () => {
    let body = '';
    for (let item of store.records) {
      body += `${item.key} = ${item.value}\n`
    }
    this.setState({readOnly: true, body})
  };

  handleSubmit = () => {
    this.setState({loading: true});
    const formData = {type: store.type, o_id: store.id, env_id: store.env.id, data: this.state.body};
    http.post('/api/config/parse/text/', formData)
      .then(res => {
        message.success('保存成功');
        store.fetchRecords().then(this.updateValue)
      })
      .finally(() => this.setState({loading: false}))
  };

  render() {
    const {body, loading, readOnly} = this.state;
    return (
      <div style={{position: 'relative'}}>
        <ACEditor
          mode="space"
          width="100%"
          height="500px"
          theme="tomorrow"
          value={body}
          readOnly={readOnly}
          onChange={v => this.setState({body: v})}/>
        {readOnly && <AuthButton
          icon={<EditOutlined/>}
          type="link"
          size="large"
          auth={`config.${store.type}.edit_config`}
          style={{position: 'absolute', top: 0, right: 0}}
          onClick={() => this.setState({readOnly: false})}>编辑</AuthButton>}
        {readOnly || <Button
          icon={<SaveOutlined />}
          type="link"
          size="large"
          loading={loading}
          style={{position: 'absolute', top: 0, right: 0}}
          onClick={this.handleSubmit}>保存</Button>}
      </div>
    )
  }
}

export default TextView
