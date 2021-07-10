/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { Drawer, Breadcrumb, Table, Icon, Divider, Switch, Button, Progress, Modal, message } from 'antd';
import { http, uniqueId, X_TOKEN } from 'libs';
import lds from 'lodash';
import styles from './index.module.css'


class FileManager extends React.Component {
  constructor(props) {
    super(props);
    this.input = null;
    this.id = props.id;
    this.state = {
      fetching: false,
      showDot: false,
      uploading: false,
      uploadStatus: 'active',
      pwd: [],
      objects: [],
      percent: 0
    }
  }

  columns = [{
    title: '名称',
    key: 'name',
    render: info => info.kind === 'd' ? (
      <div onClick={() => this.handleChdir(info.name, '1')} style={{cursor: 'pointer'}}>
        <Icon type="folder" style={{color: '#1890ff'}}/>
        <span style={{color: '#1890ff', paddingLeft: 5}}>{info.name}</span>
      </div>
    ) : (
      <React.Fragment>
        <Icon type="file"/>
        <span style={{paddingLeft: 5}}>{info.name}</span>
      </React.Fragment>
    ),
    ellipsis: true
  }, {
    title: '大小',
    dataIndex: 'size',
    align: 'right',
    className: styles.fileSize,
    width: 90
  }, {
    title: '修改时间',
    dataIndex: 'date',
    width: 190
  }, {
    title: '属性',
    key: 'attr',
    render: info => `${info.kind}${info.code}`,
    width: 120
  }, {
    title: '操作',
    width: 80,
    align: 'right',
    key: 'action',
    render: info => info.kind === '-' ? (
      <React.Fragment>
        <Icon style={{color: '#1890ff'}} type="download" onClick={() => this.handleDownload(info.name)}/>
        <Divider type="vertical"/>
        <Icon style={{color: 'red'}} type="delete" onClick={() => this.handleDelete(info.name)}/>
      </React.Fragment>
    ) : null
  }];

  onShow = (visible) => {
    if (visible) {
      this.fetchFiles()
    }
  };

  _kindSort = (item) => {
    return item.kind === 'd'
  };

  fetchFiles = (pwd) => {
    this.setState({fetching: true});
    pwd = pwd || this.state.pwd;
    const path = '/' + pwd.join('/');
    http.get('/api/file/', {params: {id: this.id, path}})
      .then(res => {
        const objects = lds.orderBy(res, [this._kindSort, 'name'], ['desc', 'asc']);
        this.setState({objects, pwd})
      })
      .finally(() => this.setState({fetching: false}))
  };

  handleChdir = (name, action) => {
    let pwd = this.state.pwd.map(x => x);
    if (action === '1') {
      pwd.push(name)
    } else if (action === '2') {
      const index = pwd.indexOf(name);
      pwd = pwd.splice(0, index + 1)
    } else {
      pwd = []
    }
    this.fetchFiles(pwd)
  };

  handleUpload = () => {
    this.input.click();
    this.input.onchange = e => {
      this.setState({uploading: true, uploadStatus: 'active', percent: 0});
      const file = e.target['files'][0];
      const formData = new FormData();
      const token = uniqueId();
      this._updatePercent(token);
      formData.append('file', file);
      formData.append('id', this.id);
      formData.append('token', token);
      formData.append('path', '/' + this.state.pwd.join('/'));
      this.input.value = '';
      http.post('/api/file/object/', formData, {timeout: 600000})
        .then(() => {
          this.setState({uploadStatus: 'success'});
          this.fetchFiles()
        }, () => this.setState({uploadStatus: 'exception'}))
        .finally(() => setTimeout(() => this.setState({uploading: false}), 2000))
    }
  };

  _updatePercent = token => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.socket = new WebSocket(`${protocol}//${window.location.host}/api/ws/exec/${token}/?x-token=${X_TOKEN}`);
    this.socket.onopen = () => this.socket.send('ok');
    this.socket.onmessage = e => {
      if (e.data === 'pong') {
        this.socket.send('ping')
      } else {
        const percent = Number(e.data);
        if (percent > this.state.percent) this.setState({percent});
        if (percent === 100) {
          this.socket.close()
        }
      }
    }
  };

  handleDownload = (name) => {
    const file = `/${this.state.pwd.join('/')}/${name}`;
    const link = document.createElement('a');
    link.href = `/api/file/object/?id=${this.id}&file=${file}&x-token=${X_TOKEN}`;
    document.body.appendChild(link);
    const evt = document.createEvent("MouseEvents");
    evt.initEvent("click", false, false);
    link.dispatchEvent(evt);
    document.body.removeChild(link);
    message.warning('即将开始下载，请勿重复点击。')
  };

  handleDelete = (name) => {
    const file = `/${this.state.pwd.join('/')}/${name}`;
    Modal.confirm({
      title: '删除文件确认',
      content: `确认删除文件：${file} ?`,
      onOk: () => {
        return http.delete('/api/file/object/', {params: {id: this.id, file}})
          .then(() => {
            message.success('删除成功');
            this.fetchFiles()
          })
      }
    })
  };

  render() {
    let objects = this.state.objects;
    if (!this.state.showDot) {
      objects = objects.filter(x => !x.name.startsWith('.'))
    }
    const scrollY = document.body.clientHeight - 222;
    return (
      <Drawer
        title="文件管理器"
        placement="right"
        width={900}
        afterVisibleChange={this.onShow}
        visible={this.props.visible}
        onClose={this.props.onClose}>
        <input style={{display: 'none'}} type="file" ref={ref => this.input = ref}/>
        <div className={styles.drawerHeader}>
          <Breadcrumb>
            <Breadcrumb.Item href="#" onClick={() => this.handleChdir('', '0')}>
              <Icon type="home"/>
            </Breadcrumb.Item>
            {this.state.pwd.map(item => (
              <Breadcrumb.Item key={item} href="#" onClick={() => this.handleChdir(item, '2')}>
                <span>{item}</span>
              </Breadcrumb.Item>
            ))}
          </Breadcrumb>
          <div style={{display: 'flex', alignItems: 'center'}}>
            <span>显示隐藏文件：</span>
            <Switch
              checked={this.state.showDot}
              checkedChildren="开启"
              unCheckedChildren="关闭"
              onChange={v => this.setState({showDot: v})}/>
            <Button style={{marginLeft: 10}} size="small" type="primary" icon="upload"
                    onClick={this.handleUpload}>上传文件</Button>
          </div>
        </div>
        {this.state.uploading && (
          <Progress style={{marginBottom: 15}} status={this.state.uploadStatus} percent={this.state.percent}/>
        )}
        <Table
          size="small"
          rowKey="name"
          loading={this.state.fetching}
          pagination={false}
          columns={this.columns}
          scroll={{y: scrollY}}
          bodyStyle={{fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace"}}
          dataSource={objects}/>
      </Drawer>
    )
  }
}

export default FileManager