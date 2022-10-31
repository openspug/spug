/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { message } from 'antd';
import { ACEditor } from 'components';
import { http } from 'libs';
import store from './store';

@observer
class JSONView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      body: ''
    }
  }

  componentDidMount() {
    this.updateValue()
  }

  updateValue = () => {
    const body = {};
    for (let item of store.records) {
      body[item.key] = item.value
    }
    this.setState({body: JSON.stringify(body, null, 2)})
  };

  handleSubmit = () => {
    try {
      const data = JSON.parse(this.state.body);
      const formData = {type: store.type, o_id: store.id, env_id: store.env.id, data};
      return http.post('/api/config/parse/json/', formData)
        .then(res => {
          message.success('保存成功');
          store.fetchRecords().then(this.updateValue)
        })
    } catch (err) {
      message.error('解析JSON失败，请检查输入内容')
    }
  };

  render() {
    const {body} = this.state;
    return (
      <ACEditor
        mode="json"
        theme="tomorrow"
        height="500px"
        width="100%"
        readOnly={!this.props.editable}
        setOptions={{useWorker: false}}
        value={body}
        onChange={v => this.setState({body: v})}/>
    )
  }
}

export default JSONView
