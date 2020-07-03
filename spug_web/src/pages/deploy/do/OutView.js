/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import styles from './index.module.css';

@observer
class OutView extends React.Component {
  constructor(props) {
    super(props);
    this.el = null;
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    setTimeout(() => this.el.scrollTop = this.el.scrollHeight, 100)
  }

  render() {
    return (
      <pre ref={el => this.el = el} className={styles.ext1Console}>
        {this.props.outputs}
      </pre>
    )
  }
}

export default OutView