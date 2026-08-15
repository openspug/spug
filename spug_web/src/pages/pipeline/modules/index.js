/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useEffect } from 'react';
import SSHExec from './SSHExec';
import Build from './Build';
import Parameter from './Parameter';
import DataUpload from './DataUpload';
import DataTransfer from './DataTransfer';
import PushWebhook from './PushWebhook';
import PushSpug from './PushSpug';
import { t } from 'libs';

// 未选择模块时必须把 handler 清掉：NodeConfig 里的 handler 是 useState，切换节点时
// 不会自动重置，残留的上一个模块的 handleSave 会把旧配置写到当前节点上。
function Empty(props) {
  useEffect(() => {
    props.setHandler(undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.node])
  return <div style={{padding: 24, color: '#999'}}>{t('请选择节点模块')}</div>
}

function ModuleConfig(props) {
  switch (props.node.module) {
    case 'ssh_exec':
      return <SSHExec {...props}/>
    case 'build':
      return <Build {...props}/>
    case 'data_transfer':
      return <DataTransfer {...props}/>
    case 'parameter':
      return <Parameter {...props}/>
    case 'data_upload':
      return <DataUpload {...props}/>
    case 'push_dd':
    case 'push_fs':
    case 'push_wx':
      return <PushWebhook {...props}/>
    case 'push_spug':
      return <PushSpug {...props}/>
    default:
      return <Empty {...props}/>
  }
}

export default ModuleConfig