/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import {Card } from 'antd';

export default function (props) {
  return (
    <Card>
      <div>{localStorage.getItem('nickname')}, 欢迎你</div>
    </Card>
  )
}
