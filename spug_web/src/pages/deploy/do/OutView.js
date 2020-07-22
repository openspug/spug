/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { toJS } from 'mobx';
import { observer } from 'mobx-react';
import styles from './index.module.css';
import store from './store';
import lds from 'lodash';

@observer
class OutView extends React.Component {
  constructor(props) {
    super(props);
    this.el = null;
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    setTimeout(() => {
      if (this.el) this.el.scrollTop = this.el.scrollHeight
    }, 100)
  }

  render() {
    const outputs = lds.get(store.outputs, `${this.props.id}.data`, []);
    return (
      <pre ref={el => this.el = el} className={styles.ext1Console}>
        {toJS(outputs)}
      </pre>
    )
  }
}

export default OutView