import React from 'react';
import { observer } from 'mobx-react';
import { Modal, Checkbox, Row, Col, message } from 'antd';
import http from 'libs/http';
import store from './store';
import codes from './codes';
import styles from './index.module.css';
import lds from 'lodash';

@observer
class Permission extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
    }
  }

  handleSubmit = () => {
    console.log(JSON.stringify(store.permissions));
    // this.setState({loading: true});
    // const formData = this.props.form.getFieldsValue();
    // formData['id'] = store.record.id;
    // http.post('/api/account/role/', formData)
    //   .then(res => {
    //     message.success('操作成功');
    //     store.formVisible = false;
    //     store.fetchRecords()
    //   }, () => this.setState({loading: false}))
  };

  handleAllCheck = (e, mod, page) => {
    const checked = e.target.checked;
    if (checked) {
      const key = `${mod}.${page}`;
      store.permissions[mod][page] = lds.clone(store.allPerms[key])
    } else {
      store.permissions[mod][page] = []
    }
  };

  handlePermCheck = (mod, page, perm) => {
    const perms = store.permissions[mod][page];
    if (perms.includes(perm)) {
      perms.splice(perms.indexOf(perm), 1)
    } else {
      perms.push(perm)
    }
  };

  PermBox = observer(({mod, page, perm, children}) => (
    <Checkbox
      value={perm}
      onChange={() => this.handlePermCheck(mod, page, perm)}
      checked={store.permissions[mod][page].includes(perm)}>
      {children}
    </Checkbox>
  ));

  render() {
    const PermBox = this.PermBox;
    return (
      <Modal
        visible
        width={1000}
        maskClosable={false}
        title="功能权限设置"
        onCancel={() => store.permVisible = false}
        confirmLoading={this.state.loading}
        onOk={this.handleSubmit}>
        <table border="1" className={styles.container}>
          <thead>
          <tr>
            <th>模块</th>
            <th>页面</th>
            <th>功能</th>
          </tr>
          </thead>
          <tbody>
          {codes.map(mod => (
            mod.pages.map((page, index) => (
              <tr key={page.key}>
                {index === 0 && <td rowSpan={mod.pages.length}>{mod.label}</td>}
                <td>
                  <Checkbox onChange={e => this.handleAllCheck(e, mod.key, page.key)}>
                    {page.label}
                  </Checkbox>
                </td>
                <td>
                  <Row>
                    {page.perms.map(perm => (
                      <Col key={perm.key} span={8}>
                        <PermBox mod={mod.key} page={page.key} perm={perm.key}>{perm.label}</PermBox>
                      </Col>
                    ))}
                  </Row>
                </td>
              </tr>
            ))
          ))}

          </tbody>
        </table>
      </Modal>
    )
  }
}

export default Permission