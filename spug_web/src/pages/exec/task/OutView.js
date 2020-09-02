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
    const outputs = toJS(this.props.outputs);
    const maxHeight = store.isFullscreen ? 500 : 300;
    return (
      <div ref={ref => this.el = ref} className={styles.console} style={{maxHeight}}>
        <pre style={{color: '#91d5ff'}}>{outputs['system']}</pre>
        <pre>{outputs['info']}</pre>
        <pre style={{color: '#ffa39e'}}>{outputs['error']}</pre>
      </div>
    )
  }
}

export default OutView