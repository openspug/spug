/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { Button } from 'antd';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import FileManager from './FileManager';
import { http } from 'libs';
import 'xterm/css/xterm.css';
import styles from './index.module.css';


class WebSSH extends React.Component {
  constructor(props) {
    super(props);
    this.id = props.match.params.id;
    this.token = localStorage.getItem('token');
    this.socket = null;
    this.term = new Terminal();
    this.container = null;
    this.input = null;
    this.state = {
      visible: false,
      uploading: false,
      managerDisabled: true,
      host: {},
      percent: 0
    }
  }

  componentDidMount() {
    this._fetch();
    const fitPlugin = new FitAddon();
    this.term.loadAddon(fitPlugin);
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.socket = new WebSocket(`${protocol}//${window.location.host}/api/ws/ssh/${this.token}/${this.id}/`);
    this.socket.onmessage = e => this._read_as_text(e.data);
    this.socket.onopen = () => {
      this.term.open(this.container);
      this.term.focus();
      fitPlugin.fit();
    };
    this.socket.onclose = e => {
      if (e.code === 3333) {
        window.location.href = "about:blank";
        window.close()
      } else {
        setTimeout(() => this.term.write('\r\nConnection is closed.\r\n'), 200)
      }
    };
    this.term.onData(data => this.socket.send(JSON.stringify({data})));
    this.term.onResize(({cols, rows}) => {
      this.socket.send(JSON.stringify({resize: [cols, rows]}))
    });
    window.onresize = () => fitPlugin.fit()
  }

  _read_as_text = (data) => {
    const reader = new window.FileReader();
    reader.onload = () => this.term.write(reader.result);
    reader.readAsText(data, 'utf-8')
  };

  handleShow = () => {
    this.setState({visible: !this.state.visible})
  };

  _fetch = () => {
    http.get(`/api/host/?id=${this.id}`)
      .then(res => {
        document.title = res.name;
        this.setState({host: res, managerDisabled: false})
      })
  };

  render() {
    const {host, visible, managerDisabled} = this.state;
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div>{host.name} | {host.username}@{host.hostname}:{host.port}</div>
          <Button disabled={managerDisabled} type="primary" icon="folder-open" onClick={this.handleShow}>文件管理器</Button>
        </div>
        <div className={styles.terminal}>
          <div ref={ref => this.container = ref}/>
        </div>
        <FileManager id={this.id} visible={visible} onClose={this.handleShow} />
      </div>
    )
  }
}

export default WebSSH