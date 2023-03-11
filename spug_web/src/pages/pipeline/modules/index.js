/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import SSHExec from './SSHExec';
import Build from './Build';
import Parameter from './Parameter';
import DataTransfer from './DataTransfer';

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
    default:
      return <div>hello</div>
  }
}

export default ModuleConfig