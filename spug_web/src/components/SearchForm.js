import React from 'react';
import { Row, Col, Form } from 'antd';
import styles from './index.module.less';

export default class extends React.Component {
  static Item(props) {
    return (
      <Col span={props.span} offset={props.offset} style={props.style}>
        <Form.Item label={props.title}>
          {props.children}
        </Form.Item>
      </Col>
    )
  }

  render() {
    return (
      <div className={styles.searchForm} style={this.props.style}>
        <Form style={this.props.style}>
          <Row gutter={{md: 8, lg: 24, xl: 48}}>
            {this.props.children}
          </Row>
        </Form>
      </div>
    )
  }
}
