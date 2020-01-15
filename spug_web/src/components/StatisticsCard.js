/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React from 'react';
import { Card, Col, Row } from "antd";
import lodash from 'lodash';
import styles from './index.module.css';


class StatisticsCard extends React.Component {
  static Item = (props) => {
    return (
      <div className={styles.statisticsCard}>
        <span>{props.title}</span>
        <p>{props.value}</p>
        {props.bordered !== false && <em/>}
      </div>
    )
  };

  render() {
    let items = lodash.get(this.props, 'children', []);
    if (!lodash.isArray(items)) items = [items];
    const span = Math.ceil(24 / (items.length || 1));
    return (
      <Card bordered={false} style={{marginBottom: '24px'}}>
        <Row>
          {items.map((item, index) => (
            <Col key={index} sm={span} xs={24}>
              {item}
            </Col>
          ))}
        </Row>
      </Card>
    )
  }
}

export default StatisticsCard
