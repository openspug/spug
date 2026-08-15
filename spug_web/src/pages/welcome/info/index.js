/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { Menu } from 'antd';
import { Breadcrumb } from 'components';
import { t } from 'libs';
import Basic from './Basic';
import Reset from './Reset';
import styles from './index.module.css';

function Index() {
  const [selectedKeys, setSelectedKeys] = useState(['basic'])

  return (
    <div>
      <Breadcrumb>
        <Breadcrumb.Item>{t('首页')}</Breadcrumb.Item>
        <Breadcrumb.Item>{t('个人中心')}</Breadcrumb.Item>
      </Breadcrumb>
      <div className={styles.container}>
        <div className={styles.left}>
          <Menu
            mode="inline"
            selectedKeys={selectedKeys}
            style={{border: 'none'}}
            onSelect={({selectedKeys}) => setSelectedKeys(selectedKeys)}
            items={[
              {key: 'basic', label: t('基本设置')},
              {key: 'reset', label: t('修改密码')}
            ]}/>
        </div>
        <div className={styles.right}>
          {selectedKeys[0] === 'basic' && <Basic/>}
          {selectedKeys[0] === 'reset' && <Reset/>}
        </div>
      </div>
    </div>
  )
}

export default Index
