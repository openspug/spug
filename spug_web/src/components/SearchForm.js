/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { Row, Col, Form } from 'antd';
import styles from './index.module.css';
import lodash from "lodash";


export default class extends React.Component {
  static Item(props) {
    return (
      <Form.Item {...props} label={props.title}>
        {props.children}
      </Form.Item>
    )
  }

  render() {
    let items = lodash.get(this.props, 'children', []);
    if (!lodash.isArray(items)) items = [items];
    return (
      <Form className={styles.searchForm} style={this.props.style}>
        <Row gutter={{md: 8, lg: 24, xl: 48}}>
          {items.filter(item => item).map((item, index) => (
            <Col key={index} md={lodash.get(item.props, 'span')} sm={24}>
              {item}
            </Col>
          ))}
        </Row>
      </Form>
    )
  }
}
