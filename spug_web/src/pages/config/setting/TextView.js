import React from 'react';
import { observer } from 'mobx-react';
import Editor from 'react-ace';
import 'ace-builds/src-noconflict/mode-space';
import 'ace-builds/src-noconflict/theme-tomorrow';
import store from './store';

@observer
class TextView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      body: ''
    }
  }

  componentDidMount() {
    let body = '';
    for (let item of store.records) {
      body += `${item.key} = ${item.value}\n`
    }
    this.setState({body})
  }

  render() {
    return (
      <Editor style={{fontSize: 14}} value={this.state.body} mode="space" theme="tomorrow" height="500px" width="100%"/>
    )
  }
}

export default TextView