import React from 'react';
import {Card } from 'antd';

export default function (props) {
  return (
    <Card>
      <div>{localStorage.getItem('nickname')}, 欢迎你</div>
    </Card>
  )
}