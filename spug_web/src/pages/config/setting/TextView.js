/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { message } from 'antd';
import { ACEditor } from 'components';
import store from './store';
import { http } from 'libs';

@observer
class TextView extends React.Component {
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
    let body = '';
    for (let item of store.records) {
      body += `${item.key} = ${item.value}\n`
    }
    this.setState({body})
  };

  handleSubmit = () => {
    const formData = {type: store.type, o_id: store.id, env_id: store.env.id, data: this.state.body};
    return http.post('/api/config/parse/text/', formData)
      .then(res => {
        message.success('保存成功');
        store.fetchRecords().then(this.updateValue)
      })
  };

  render() {
    const {body} = this.state;
    return (
      <ACEditor
        mode="space"
        width="100%"
        height="500px"
        theme="tomorrow"
        value={body}
        readOnly={!this.props.editable}
        onChange={v => this.setState({body: v})}/>
    )
  }
}

export default TextView
