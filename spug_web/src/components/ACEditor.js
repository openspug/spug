/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from "react";
import Editor from 'react-ace';
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/mode-sh';
import 'ace-builds/src-noconflict/theme-tomorrow';
import 'ace-builds/src-noconflict/snippets/sh';

export default function (props) {
  return (
    <Editor
      theme="tomorrow"
      enableLiveAutocompletion={true}
      enableBasicAutocompletion={true}
      enableSnippets={true}
      {...props}
    />
  )
}
