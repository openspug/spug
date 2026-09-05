import React, { useEffect, useState } from 'react';
import { Button, Form, Input, Modal, message } from 'antd';
import { CaretRightOutlined } from '@ant-design/icons';
import { ACEditor } from 'components';
import { http, t } from 'libs';


const DEFAULT_CONTENT = `services:\n  app:\n    image: nginx:alpine\n    restart: unless-stopped\n    ports:\n      - "8080:80"\n`;

export default function CreateProject({open, hostId, onClose, onCreated}) {
  const [form] = Form.useForm();
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({workdir: '/opt/apps/'});
    setContent(DEFAULT_CONTENT);
  }, [form, open]);

  function submit() {
    form.validateFields().then(values => {
      if (!content.trim()) {
        message.warning(t('请输入 Docker Compose 配置'));
        return;
      }
      setCreating(true);
      http.post('/api/docker/create/', {
        host_id: hostId,
        project: values.project,
        workdir: values.workdir,
        content,
      }, {timeout: 920000})
        .then(result => {
          message.success(t('项目已创建并启动'));
          onCreated(result);
        })
        .finally(() => setCreating(false));
    });
  }

  return (
    <Modal open={open} width={760} maskClosable={false}
           title={t('新建项目')} onCancel={onClose}
           footer={[
             <Button key="cancel" onClick={onClose}>{t('取消')}</Button>,
             <Button key="submit" type="primary" icon={<CaretRightOutlined/>}
                     loading={creating} onClick={submit}>{t('保存并启动')}</Button>,
           ]}>
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item name="project" label={t('项目名称')}
                   extra={t('作为 Docker Compose 的项目标识，只能包含字母、数字、点、下划线和连字符。')}
                   rules={[{required: true, message: t('请输入项目名称')}, {
                     pattern: /^[A-Za-z0-9][A-Za-z0-9_.-]*$/,
                     message: t('项目名称格式无效'),
                   }]}>
          <Input maxLength={64} placeholder="my-app"/>
        </Form.Item>
        <Form.Item name="workdir" label={t('工作目录')}
                   extra={t('服务器上的绝对路径，将创建 compose.yaml。')}
                   rules={[{required: true, message: t('请输入工作目录')}, {
                     pattern: /^\/(?!$).+/,
                     message: t('请输入非根目录的绝对路径'),
                   }]}>
          <Input placeholder="/opt/apps/my-app"/>
        </Form.Item>
        <Form.Item label="compose.yaml" required>
          <ACEditor mode="text" theme="one_dark" value={content}
                    width="100%" height="320px" showPrintMargin={false} onChange={setContent}/>
        </Form.Item>
      </Form>
    </Modal>
  );
}
