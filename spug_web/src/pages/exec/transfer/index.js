/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import {
  ThunderboltOutlined,
  QuestionCircleOutlined,
  UploadOutlined,
  CloudServerOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { Form, Button, Tooltip, Space, Card, Table, Input, Upload, message } from 'antd';
import { AuthDiv, Breadcrumb } from 'components';
import HostSelector from 'pages/host/Selector';
import Output from './Output';
import { http, uniqueId } from 'libs';
import moment from 'moment';
import store from './store';
import style from './index.module.less';

function TransferIndex() {
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState([])
  const [dir, setDir] = useState('')
  const [hosts, setHosts] = useState([])
  const [percent, setPercent] = useState()
  const [token, setToken] = useState()
  const [histories, setHistories] = useState([])

  useEffect(() => {
    if (!loading) {
      http.get('/api/exec/transfer/')
        .then(res => setHistories(res))
    }
  }, [loading])

  function _handleProgress(e) {
    const data = e.loaded / e.total * 100
    if (!percent && data === 100) return
    setPercent(String(data).replace(/(\d+\.\d).*/, '$1'))
  }

  function handleSubmit() {
    const formData = new FormData();
    if (files.length === 0) return message.error('请添加数据源')
    if (!dir) return message.error('请输入目标路径')
    if (hosts.length === 0) return message.error('请选择目标主机')
    const data = {dst_dir: dir, host_ids: hosts.map(x => x.id)}
    for (let index in files) {
      const item = files[index]
      if (item.type === 'host') {
        data.host = JSON.stringify([item.host_id, item.path])
      } else {
        formData.append(`file${index}`, item.path)
      }
    }
    formData.append('data', JSON.stringify(data))
    setLoading(true)
    http.post('/api/exec/transfer/', formData, {timeout: 600000, onUploadProgress: _handleProgress})
      .then(res => {
        const tmp = {}
        for (let host of hosts) {
          tmp[host.id] = {
            title: `${host.name}(${host.hostname}:${host.port})`,
            data: '\x1b[36m### WebSocket connecting ...\x1b[0m',
            status: -2
          }
        }
        store.outputs = tmp
        setToken(res)
      })
      .finally(() => {
        setLoading(false)
        setPercent()
      })
  }

  function makeFile(row) {
    setFiles([{
      id: uniqueId(),
      type: 'host',
      name: row.name,
      path: '',
      host_id: row.id
    }])
  }

  function handleUpload(_, fileList) {
    const tmp = files.length > 0 && files[0].type === 'upload' ? [...files] : []
    for (let file of fileList) {
      tmp.push({id: uniqueId(), type: 'upload', name: '本地上传', path: file})
    }
    setFiles(tmp)
    return Upload.LIST_IGNORE
  }

  function handleRemove(index) {
    files.splice(index, 1)
    setFiles([...files])
  }

  function handleCloseOutput() {
    setToken()
    if (!store.counter['0'] && !store.counter['2']) {
      setFiles([])
    }
  }

  return (<AuthDiv auth="exec.transfer.do">
    <Breadcrumb>
      <Breadcrumb.Item>首页</Breadcrumb.Item>
      <Breadcrumb.Item>批量执行</Breadcrumb.Item>
      <Breadcrumb.Item>文件分发</Breadcrumb.Item>
    </Breadcrumb>
    <div className={style.index} hidden={token}>
      <div className={style.left}>
        <Card type="inner" title={`数据源${files.length ? `（${files.length}）` : ''}`} extra={(<Space size={24}>
          <Upload multiple beforeUpload={handleUpload}><Space
            className="btn"><UploadOutlined/>上传本地文件</Space></Upload>
          <HostSelector onlyOne mode="rows" onChange={row => makeFile(row)}>
            <Space className="btn"><CloudServerOutlined/>添加主机文件</Space>
          </HostSelector>
        </Space>)}>
          <Table rowKey="id" className={style.table} showHeader={false} pagination={false} size="small"
                 dataSource={files}>
            <Table.Column title="文件来源" dataIndex="name"/>
            <Table.Column title="文件名称/路径" render={info => info.type === 'upload' ? info.path.name : (
              <Input onChange={e => info.path = e.target.value} placeholder="请输入要同步的目录路径"/>)}/>
            <Table.Column title="操作" render={(_, __, index) => (
              <Button danger type="link" onClick={() => handleRemove(index)}>移除</Button>)}/>
          </Table>
        </Card>
        <Card type="inner" title="分发目标" style={{margin: '24px 0'}} bodyStyle={{paddingBottom: 0}} extra={(
          <Tooltip className={style.tips}
                   title="文件分发功能依赖rsync，大部分linux发行版默认都已安装，如未安装可通过「批量执行/执行任务」进行批量安装。">
            <BulbOutlined/> 小提示
          </Tooltip>
        )}>
          <Form>
            <Form.Item required label="目标路径">
              <Input value={dir} onChange={e => setDir(e.target.value)} placeholder="请输入目标路径"/>
            </Form.Item>
            <Form.Item required label="目标主机">
              <HostSelector type="button" mode="rows" value={hosts.map(x => x.id)} onChange={rows => setHosts(rows)}/>
            </Form.Item>
          </Form>
        </Card>

        <Button loading={loading} icon={<ThunderboltOutlined/>} type="primary" onClick={() => handleSubmit()}>
          {percent ? `上传中 ${percent}%` : '开始执行'}
        </Button>
      </div>

      <div className={style.right}>
        <div className={style.title}>
          分发记录
          <Tooltip title="每天自动清理，保留最近30条记录。">
            <QuestionCircleOutlined style={{color: '#999', marginLeft: 8}}/>
          </Tooltip>
        </div>
        <div className={style.inner}>
          {histories.map((item, index) => (<div key={index} className={style.item}>
            {item.host_id ? (
              <CloudServerOutlined className={style.host}/>
            ) : (
              <UploadOutlined className={style.upload}/>
            )}
            <div className={style[item.interpreter]}>{item.interpreter}</div>
            <div className={style.number}>{item.host_ids.length}</div>
            <div className={style.command}>{item.dst_dir}</div>
            <div className={style.desc}>{moment(item.updated_at).format('MM.DD HH:mm')}</div>
          </div>))}
        </div>
      </div>
    </div>
    {token ? <Output token={token} onBack={handleCloseOutput}/> : null}
  </AuthDiv>)
}

export default observer(TransferIndex)
