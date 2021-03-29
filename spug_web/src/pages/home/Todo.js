/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { Card, List } from 'antd';

function TodoIndex(props) {
  return (
    <Card title="待办事项" bodyStyle={{height: 234, padding: '0 24px'}}>
      <List>
        <List.Item>工单 ECS购买 需要你审核。</List.Item>
      </List>
    </Card>
  )
}

export default TodoIndex