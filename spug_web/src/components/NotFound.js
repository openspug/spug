import React from 'react';
import styles from './index.module.less';

export default function NotFound() {
  return (
    <div className={styles.notFound}>
      <div className={styles.imgBlock}>
        <div className={styles.img}/>
      </div>
      <div>
        <h1 className={styles.title}>404</h1>
        <div className={styles.desc}>抱歉，你访问的页面不存在</div>
      </div>
    </div>
  )
}