/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { Avatar, Button, Card, Col, Row } from 'antd';
import { LeftSquareOutlined, RightSquareOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import NavForm from './NavForm';
import styles from './index.module.less';

function NavIndex(props) {
  const [isEdit, setIsEdit] = useState(true);
  const [record, setRecord] = useState();

  function handleSubmit() {

  }

  return (
    <Card title="便捷导航" className={styles.nav} extra={<Button type="link">编辑</Button>}>
      {isEdit ? (
        <Row gutter={24}>
          <Col span={6}>
            <div className={styles.add} onClick={() => setRecord({links: [{}]})}><PlusOutlined/></div>
          </Col>
        </Row>
      ) : (
        <Row gutter={24}>
          <Col span={6}>
            <div className={styles.add}><PlusOutlined/></div>
          </Col>
          <Col span={6}>
            <Card actions={[
              <span>演示地址</span>
            ]}>
              <Card.Meta
                avatar={<Avatar src="https://gitee.com/openspug/index/raw/master/img/gitlab.png"/>}
                title="Gitlab"
                description="Gitlab 内部代码仓库，请使用公司LDAP账户登录"/>
            </Card>
          </Col>
          <Col span={6}>
            <Card actions={[
              <LeftSquareOutlined/>,
              <RightSquareOutlined/>,
              <EditOutlined/>
            ]}>
              <Card.Meta
                avatar={<Avatar src="https://gitee.com/openspug/index/raw/master/img/wiki.png"/>}
                title="Wiki系统"
                description="文档系统，技术架构及技术文档"/>
            </Card>
          </Col>
        </Row>
      )}
      {record ? <NavForm record={record} onCancel={() => setRecord(null)}/> : null}
    </Card>
  )
}

export default NavIndex