/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import Editor from 'react-ace';
import 'ace-builds/src-noconflict/mode-sh';
import 'ace-builds/src-noconflict/mode-text';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/mode-space';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/theme-tomorrow';

export default function (props) {
  const style = {fontFamily: 'source-code-pro, Menlo, Monaco, Consolas, PingFang SC, Microsoft YaHei', ...props.style}
  return (
    <Editor
      theme="tomorrow"
      fontSize={13}
      tabSize={2}
      {...props}
      style={style}
    />
  )
}
