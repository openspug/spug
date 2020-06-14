/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import styles from './index.module.css';
import { Form} from "antd";
import { observer } from 'mobx-react'


@observer
class BasicSetting extends React.Component {
  constructor(props) {
    super(props);
    this.state = {}
  }


  render() {
    return (
      <React.Fragment>
        <div className={styles.title}>基本设置</div>
      </React.Fragment>
    )
  }
}
export default Form.create()(BasicSetting)
