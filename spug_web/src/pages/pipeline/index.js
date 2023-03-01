/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { AuthDiv } from 'components';
import Table from './Table';
import Console from './console';

function Index() {
  return (
    <AuthDiv auth="pipeline.pipeline.view">
      <Table/>
      <Console/>
    </AuthDiv>
  )
}

export default observer(Index)
