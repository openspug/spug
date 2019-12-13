import React from 'react';
import { observer } from 'mobx-react';
import { Modal, message } from 'antd';
import http from 'libs/http';
import store from './store';

@observer
class ComForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      type: null,
      body: store.record['body'],
    }
  }

  handleSubmit = () => {
    this.setState({loading: true});
    const formData = this.props.form.getFieldsValue();
    formData['id'] = store.record.id;
    formData['body'] = this.state.body;
    http.post('/api/exec/template/', formData)
      .then(res => {
        message.success('操作成功');
        store.formVisible = false;
        store.fetchRecords()
      }, () => this.setState({loading: false}))
  };

  render() {
    return (
      <Modal
        visible
        width={800}
        maskClosable={false}
        title={store.record.id ? '编辑自定义发布' : '新建自定义发布'}
        onCancel={() => store.ext2Visible = false}
        footer={null}>

      </Modal>
    )
  }
}

export default ComForm