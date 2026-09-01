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
import 'ace-builds/src-noconflict/mode-sql';
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/theme-tomorrow';
import 'ace-builds/src-noconflict/theme-one_dark';

function ACEditor (props) {
  const {editorRef, ...editorProps} = props;
  const style = {fontFamily: 'Source Code Pro, Courier New, Courier, Monaco, monospace, PingFang SC, Microsoft YaHei', ...props.style}
  return (
    <Editor
      ref={editorRef}
      theme="tomorrow"
      fontSize={13}
      tabSize={2}
      {...editorProps}
      style={style}
    />
  )
}

ACEditor.defaultProps = {
  mode: 'sh'
}

export default ACEditor
