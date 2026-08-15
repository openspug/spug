/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { Modal, Form, Input, Radio, Switch, message } from 'antd';
import { t } from 'libs';
import S from './store';
import lds from 'lodash';

export default function Parameter(props) {
  const [form] = Form.useForm();

  function handleSubmit() {
    const formData = form.getFieldsValue();
    formData.id = props.parameter.id
    if (!formData.name) return message.error(t('请输入参数名'))
    if (!formData.variable) return message.error(t('请输入变量名'))
    if (!formData.type) return message.error(t('请选择参数类型'))
    if (formData.type === 'select' && !formData.options) return message.error(t('请输入可选项'))
    const tmp = lds.find(props.parameters, {variable: formData.variable})
    if (tmp && tmp.id !== formData.id) return message.error(t('变量名重复'))
    props.onOk(formData)
  }

  return (
    <Modal
      visible
      width={600}
      maskClosable={false}
      title={t('编辑参数')}
      onCancel={props.onCancel}
      onOk={handleSubmit}>
      <Form form={form} initialValues={props.parameter} labelCol={{span: 6}} wrapperCol={{span: 14}}>
        <Form.Item required name="name" label={t('参数名')} tooltip={t('参数的简短名称。')}>
          <Input placeholder={t('请输入参数名称')}/>
        </Form.Item>
        <Form.Item required name="variable" label={t('变量名')}
                   tooltip={t('在脚本使用的变量名称，固定前缀_SPUG_ + 输入的变量名，例如变量名name，则最终生成环境变量为 _SPUG_name')}>
          <Input placeholder={t('请输入变量名')}/>
        </Form.Item>
        <Form.Item required name="type" label={t('参数类型')} tooltip={t('不同类型展示的形式不同。')}>
          <Radio.Group style={{width: '100%'}}>
            {Object.entries(S.ParameterTypes).map(([key, val]) => (
              <Radio.Button key={key} value={key}>{val}</Radio.Button>
            ))}
          </Radio.Group>
        </Form.Item>
        <Form.Item noStyle shouldUpdate>
          {({getFieldValue}) =>
            ['select'].includes(getFieldValue('type')) ? (
              <Form.Item required name="options" label={t('可选项')} tooltip={t('每项单独一行，每行可以用英文冒号分割前边是值后边是显示的内容。')}>
                <Input.TextArea autoSize={{minRows: 3, maxRows: 5}} placeholder={t('每行一个选项，例如：\r\ntest:测试环境\r\nprod:生产环境')}/>
              </Form.Item>
            ) : null
          }
        </Form.Item>
        <Form.Item name="required" valuePropName="checked" label={t('必填')} tooltip={t('该参数是否为必填项')}>
          <Switch checkedChildren={t('是')} unCheckedChildren={t('否')}/>
        </Form.Item>
        <Form.Item name="default" label={t('默认值')}>
          <Input placeholder={t('请输入')}/>
        </Form.Item>
        <Form.Item name="desc" label={t('提示信息')} tooltip={t('会展示在参数的输入框下方。')}>
          <Input placeholder={t('请输入该参数的帮助提示信息')}/>
        </Form.Item>
      </Form>
    </Modal>
  )
}