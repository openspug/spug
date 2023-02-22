/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { AuthDiv } from 'components';
import Editor from './Editor';

export default observer(function () {
  return (
    <AuthDiv auth="system.account.view">
      <Editor/>
    </AuthDiv>
  )
})
