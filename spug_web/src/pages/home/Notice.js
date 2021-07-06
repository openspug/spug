/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useEffect, useState } from 'react';
import { Card, List, Modal, Form, Input, Switch, Divider, Typography } from 'antd';
import { DownSquareOutlined, PlusOutlined, UpSquareOutlined, SoundOutlined, DeleteOutlined } from '@ant-design/icons';
import { AuthButton } from 'components';
import { http } from 'libs';
import styles from './index.module.less';

function NoticeIndex(props) {
  const id = localStorage.getItem('id');
  const [form] = Form.useForm();
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [records, setRecords] = useState([]);
  const [record, setRecord] = useState();
  const [notice, setNotice] = useState();

  useEffect(() => {
    fetchRecords()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function fetchRecords() {
    setFetching(true);
    http.get('/api/home/notice/')
      .then(res => {
        setRecords(res);
        for (let item of res) {
          if (item.is_stress && !item.read_ids.includes(id)) {
            setNotice(item)
          }
        }
      })
      .finally(() => setFetching(false))
  }

  function handleSubmit() {
    setLoading(true);
    const formData = form.getFieldsValue();
    formData['id'] = record.id;
    http.post('/api/home/notice/', formData)
      .then(() => {
        fetchRecords()
        setRecord(null)
      })
      .finally(() => setLoading(false))
  }

  function showForm(info) {
    setRecord(info);
    setTimeout(() => form.resetFields())
  }

  function handleSort(e, info, sort) {
    e.stopPropagation();
    http.patch('/api/home/notice/', {id: info.id, sort})
      .then(() => fetchRecords())
  }

  function handleRead() {
    if (!notice.read_ids.includes(id)) {
      const formData = {id: notice.id, read: 1};
      http.patch('/api/home/notice/', formData)
        .then(() => fetchRecords())
    }
    setNotice(null);
  }

  function handleDelete(item) {
    Modal.confirm({
      title: '操作确认',
      content: `确定要删除系统公告【${item.title}】？`,
      onOk: () => http.delete('/api/home/notice/', {params: {id: item.id}})
        .then(fetchRecords)
    })
  }

  return (
    <Card
      title="系统公告"
      loading={fetching}
      className={styles.notice}
      extra={<AuthButton auth="admin" type="link"
                         onClick={() => setIsEdit(!isEdit)}>{isEdit ? '完成' : '编辑'}</AuthButton>}>
      {isEdit ? (
        <List>
          <div className={styles.add} onClick={() => showForm({})}><PlusOutlined/>新建公告</div>
          {records.map(item => (
            <List.Item key={item.id}>
              <div className={styles.item}>
                <UpSquareOutlined onClick={e => handleSort(e, item, 'up')}/>
                <Divider type="vertical"/>
                <DownSquareOutlined onClick={e => handleSort(e, item, 'down')}/>
                <div className={styles.title} style={{marginLeft: 24}} onClick={() => showForm(item)}>{item.title}</div>
                <DeleteOutlined style={{color: 'red', marginLeft: 12}} onClick={() => handleDelete(item)}/>
              </div>
            </List.Item>
          ))}
        </List>
      ) : (
        <List>
          {records.map(item => (
            <List.Item key={item.id} className={styles.item} onClick={() => setNotice(item)}>
              {!item.read_ids.includes(id) && <SoundOutlined style={{color: '#ff4d4f', marginRight: 4}}/>}
              <span className={styles.title}>{item.title}</span>
              <span className={styles.date}>{item.created_at.substr(0, 10)}</span>
            </List.Item>
          ))}
          {records.length === 0 && (
            <div style={{marginTop: 12, color: '#999'}}>暂无公告信息</div>
          )}
        </List>
      )}
      <Modal
        title="编辑公告"
        visible={record}
        onCancel={() => setRecord(null)}
        confirmLoading={loading}
        onOk={handleSubmit}>
        <Form form={form} initialValues={record} labelCol={{span: 5}} wrapperCol={{span: 18}}>
          <Form.Item name="is_stress" valuePropName="checked" tooltip="自动弹窗强提醒，仅能设置一条公告。" label="弹窗提醒">
            <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
          </Form.Item>
          <Form.Item required name="title" label="公告标题">
            <Input placeholder="请输入"/>
          </Form.Item>
          <Form.Item required name="content" tooltip="" label="公告内容">
            <Input.TextArea placeholder="请输入"/>
          </Form.Item>
        </Form>
      </Modal>
      {notice ? (
        <Modal title={notice.title} visible={notice} footer={null} onCancel={handleRead}>
          <Typography>
            {notice.content.split('\n').map((item, index) => (
              <Typography.Paragraph key={index}>{item}</Typography.Paragraph>
            ))}
          </Typography>
        </Modal>
      ) : null}
    </Card>
  )
}

export default NoticeIndex