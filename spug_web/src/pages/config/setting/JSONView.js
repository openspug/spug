import React from 'react';
import { observer } from 'mobx-react';
import Editor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-tomorrow';
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
    const body = {};
    for (let item of store.records) {
      body[item.key] = item.value
    }
    this.setState({body: JSON.stringify(body, null, 2)})
  }

  render() {
    return (
      <Editor
        mode="json"
        theme="tomorrow"
        height="500px"
        width="100%"
        readOnly={true}
        setOptions={{useWorker: false}}
        style={{fontSize: 14}}
        value={this.state.body}
        onChange={v => this.setState({body: v})}
      />
    )
  }
}

export default JSONView