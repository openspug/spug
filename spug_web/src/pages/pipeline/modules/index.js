import React from 'react';
import SSHExec from './SSHExec';
import Build from './Build';
import DataTransfer from './DataTransfer';

function ModuleConfig(props) {
  switch (props.node.module) {
    case 'remote_exec':
      return <SSHExec {...props}/>
    case 'build':
      return <Build {...props}/>
    case 'data_transfer':
      return <DataTransfer {...props}/>
    default:
      return <div>hello</div>
  }
}

export default ModuleConfig