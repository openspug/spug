import React from 'react';
import { observer } from 'mobx-react';
import { BuildOutlined, OrderedListOutlined } from '@ant-design/icons';
import { Modal, Card } from 'antd';
import store from './store';
import styles from './index.module.css';

@observer
class AddSelect extends React.Component {
  switchExt1 = () => {
    store.addVisible = false;
    store.ext1Visible = true;
    store.deploy = {
      git_type: 'branch',
      is_audit: false,
      rst_notify: {mode: '0'},
      host_ids: [],
      filter_rule: {type: 'exclude', data: ''}
    }
  };

  switchExt2 = () => {
    store.addVisible = false;
    store.ext2Visible = true;
    store.deploy = {
      is_audit: false,
      rst_notify: {mode: '0'},
      host_ids: [],
      host_actions: [],
      server_actions: []
    }
  };

  render() {
    const modalStyle = {
      display: 'flex',
      justifyContent: 'space-around',
      backgroundColor: 'rgba(240, 242, 245, 1)',
      padding: '80px 0'
    };

    return (
      <Modal
        visible
        width={800}
        maskClosable={false}
        title="选择发布方式"
        bodyStyle={modalStyle}
        onCancel={() => store.addVisible = false}
        footer={null}>
        <Card
          style={{width: 300, cursor: 'pointer'}}
          bodyStyle={{display: 'flex'}}
          onClick={this.switchExt1}>
          <div style={{marginRight: 16}}>
            <OrderedListOutlined style={{fontSize: 36, color: '#1890ff'}} />
          </div>
          <div>
            <div className={styles.cardTitle}>常规发布</div>
            <div className={styles.cardDesc}>
              系统会自动控制发布的主流程，你可添加hooks来执行额外的自定义操作。
            </div>
          </div>
        </Card>
        <Card
          style={{width: 300, cursor: 'pointer'}}
          bodyStyle={{display: 'flex'}}
          onClick={this.switchExt2}>
          <div style={{marginRight: 16}}>
            <BuildOutlined style={{fontSize: 36, color: '#1890ff'}} />
          </div>
          <div>
            <div className={styles.cardTitle}>自定义发布</div>
            <div className={styles.cardDesc}>
              你可以完全自己定义发布的所有流程和操作，系统会自动按顺序依次执行你记录的动作。
            </div>
          </div>
        </Card>
      </Modal>
    )
  }
}

export default AddSelect
