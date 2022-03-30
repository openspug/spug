/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { Form, Input, Modal, Button, Upload, Avatar, message } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { http } from 'libs';
import styles from './index.module.less';
import lds from 'lodash';

function NavForm(props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState(props.record);
  const [fileList, setFileList] = useState([]);

  useEffect(() => {
    if (props.record.logo) {
      setFileList([{uid: 0, thumbUrl: props.record.logo}])
    }
  }, [props.record])

  function handleSubmit() {
    const formData = form.getFieldsValue();
    const links = record.links.filter(x => x.name && x.url);
    if (links.length === 0) return message.error('请设置至少一条导航链接');
    if (fileList.length === 0) return message.error('请上传导航logo');
    formData.id = record.id;
    formData.links = links;
    formData.logo = fileList[0].thumbUrl;
    setLoading(true);
    http.post('/api/home/navigation/', formData)
      .then(() => {
        props.onOk();
      }, () => setLoading(false))
  }

  function add() {
    record.links.push({});
    setRecord(lds.cloneDeep(record))
  }

  function remove(index) {
    record.links.splice(index, 1);
    setRecord(lds.cloneDeep(record))
  }

  function changeLink(e, index, key) {
    record.links[index][key] = e.target.value;
    setRecord(lds.cloneDeep(record))
  }

  function beforeUpload(file) {
    if (file.size / 1024 > 100) {
      message.error('图片将直接存储至数据库，请上传小于100KB的图片');
      setTimeout(() => setFileList([]))
    }
    return false
  }

  return (
    <Modal
      visible
      title={`${record.id ? '编辑' : '新建'}链接`}
      onCancel={props.onCancel}
      confirmLoading={loading}
      onOk={handleSubmit}>
      <Form form={form} initialValues={record} labelCol={{span: 5}} wrapperCol={{span: 18}}>
        <Form.Item required label="导航图标">
          <Upload
            accept="image/*"
            listType="picture-card"
            fileList={fileList}
            beforeUpload={beforeUpload}
            showUploadList={{showPreviewIcon: false}}
            onChange={({fileList}) => setFileList(fileList)}>
            {fileList.length === 0 && (
              <div>
                <PlusOutlined/>
                <div style={{marginTop: 8}}>点击上传</div>
              </div>
            )}
          </Upload>
          <div className={styles.imgExample}>
            {['gitlab', 'gitee', 'grafana', 'prometheus', 'wiki'].map(item => (
              <Avatar
                key={item}
                src={`/resource/${item}.png`}
                onClick={() => setFileList([{uid: 0, thumbUrl: `/resource/${item}.png`}])}/>
            ))}
          </div>
        </Form.Item>
        <Form.Item required name="title" label="导航标题">
          <Input placeholder="请输入"/>
        </Form.Item>
        <Form.Item required name="desc" label="导航描述">
          <Input placeholder="请输入"/>
        </Form.Item>
        <Form.Item required label="导航链接" style={{marginBottom: 0}}>
          {record.links.map((item, index) => (
            <div key={index} style={{display: 'flex', alignItems: 'center', marginBottom: 12}}>
              <Form.Item style={{display: 'inline-block', margin: 0, width: 100}}>
                <Input value={item.name} onChange={e => changeLink(e, index, 'name')} placeholder="链接名称"/>
              </Form.Item>
              <Form.Item style={{display: 'inline-block', width: 210, margin: '0 8px'}}>
                <Input value={item.url} onChange={e => changeLink(e, index, 'url')} placeholder="请输入链接地址"/>
              </Form.Item>
              {record.links.length > 1 && (
                <MinusCircleOutlined className={styles.minusIcon} onClick={() => remove(index)}/>
              )}
            </div>
          ))}
        </Form.Item>
        <Form.Item wrapperCol={{span: 18, offset: 5}}>
          <Button type="dashed" onClick={add} style={{width: 318}} icon={<PlusOutlined/>}>
            添加链接（推荐最多三个）
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default NavForm
