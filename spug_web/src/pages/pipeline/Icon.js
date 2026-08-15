/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { Avatar } from 'antd';
import iconSSHExec from './assets/icon_ssh_exec.png';
import iconBuild from './assets/icon_build.png';
import iconParameter from './assets/icon_parameter.png';
import iconDataTransfer from './assets/icon_data_transfer.png';
import iconDataUpload from './assets/icon_data_upload.png';
import iconPushSpug from './assets/icon_push_spug.png';
import iconPushDD from './assets/icon_push_dd.png';
import iconPushFS from './assets/icon_push_fs.png';
import iconPushWx from './assets/icon_push_wx.svg';
import iconSelect from './assets/icon_select.png';

function FeishuIcon({size}) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      backgroundColor: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      <img src={iconPushFS} alt="" style={{width: '82%', height: '82%', objectFit: 'contain'}}/>
    </div>
  )
}

function Icon(props) {
  switch (props.module) {
    case 'ssh_exec':
      return <Avatar size={props.size || 42} src={iconSSHExec}/>
    case 'build':
      return <Avatar size={props.size || 42} src={iconBuild}/>
    case 'parameter':
      return <Avatar size={props.size || 42} src={iconParameter}/>
    case 'data_transfer':
      return <Avatar size={props.size || 42} src={iconDataTransfer}/>
    case 'data_upload':
      return <Avatar size={props.size || 42} src={iconDataUpload}/>
    case 'push_spug':
      return <Avatar size={props.size || 42} src={iconPushSpug}/>
    case 'push_dd':
      return <Avatar size={props.size || 42} src={iconPushDD}/>
    case 'push_fs':
      // 飞书官方 logo 是彩色透明底，不像其余图标那样自带圆形色块。这里手写圆底而不是
      // 用 Avatar：Avatar 会把 children 自动缩放来适配容器，图案会被缩得很小。
      return <FeishuIcon size={props.size || 42}/>
    case 'push_wx':
      return <Avatar size={props.size || 42} src={iconPushWx}/>
    case undefined:
      return <Avatar size={props.size || 42} src={iconSelect}/>
    default:
      return <Avatar size={props.size || 42}/>
  }
}

export default Icon