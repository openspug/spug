import React from 'react';
import { Button } from 'antd';


export default function LinkButton(props) {
  return <Button type="link" style={{padding: 0}} {...props}>{props.children}</Button>
}