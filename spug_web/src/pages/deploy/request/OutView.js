/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useRef, useEffect } from 'react';
import styles from './index.module.less';

function OutView(props) {
  const el = useRef()

  useEffect(() => {
    if (el) el.current.scrollTop = el.current.scrollHeight
  })

  return (
    <pre ref={el} className={styles.out}>{props.records}</pre>
  )
}

export default OutView