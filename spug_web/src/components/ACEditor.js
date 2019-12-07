import React from "react";
import Editor from 'react-ace';
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/mode-sh';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/mode-text';
import 'ace-builds/src-noconflict/theme-tomorrow';
import 'ace-builds/src-noconflict/snippets/sh';
import 'ace-builds/src-noconflict/snippets/json';
import 'ace-builds/src-noconflict/snippets/text';

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