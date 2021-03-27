import React from 'react';
import { Avatar, Button, Card, Col, Row } from 'antd';
import styles from './index.module.less';

function NavIndex(props) {
  return (
    <Card title="便捷导航" className={styles.nav} extra={<Button type="link">编辑</Button>}>
        <Row gutter={24}>
          <Col span={6}>
            <Card>
              <Card.Meta
                avatar={<Avatar src="https://gitee.com/openspug/index/raw/master/img/gitlab.png"/>}
                title="Gitlab"
                description="Gitlab 内部代码仓库，请使用公司LDAP账户登录"/>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Card.Meta
                avatar={<Avatar src="https://gitee.com/openspug/index/raw/master/img/wiki.png"/>}
                title="Wiki系统"
                description="文档系统，技术架构及技术文档"/>
            </Card>
          </Col>
        </Row>
      </Card>
  )
}

export default NavIndex