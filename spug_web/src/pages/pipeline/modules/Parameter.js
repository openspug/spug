/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useEffect, useState } from 'react';
import { observer, useLocalStore } from 'mobx-react';
import {
  Form,
  Input,
  Button,
  Modal,
  Switch,
  Select,
  Popconfirm,
  Tooltip,
  DatePicker,
  Upload,
  message
} from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, QuestionCircleOutlined, UploadOutlined } from '@ant-design/icons';
import { clsNames } from 'libs';
import css from './index.module.less';
import lds from "lodash";

function Editor(props) {
  const [form] = Form.useForm();
  const [options, setOptions] = useState(null);

  useEffect(() => {
    if (props.index === undefined) return;
    if (props.index === -1) {
      form.resetFields()
    } else {
      let strs = []
      const values = props.params[props.index]
      if (['select', 'select2'].includes(values.type)) {
        for (let item of values.options) {
          if (item.value === item.label) {
            strs.push(item.value)
          } else {
            strs.push(`${item.value}:${item.label}`)
          }
        }
        setOptions(strs.join('\n'))
      }
      form.setFieldsValue(values)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.index])

  function handleSubmit() {
    const data = form.getFieldsValue();
    if (!data.name) return message.error('请输入参数名')
    if (!data.variable) return message.error('请输入变量名')
    if (!/^\w+$/.test(data.variable)) return message.error('变量名只能包含字母、数字或下划线')
    if (!data.type) return message.error('请选择参数类型')
    if (['select', 'select2'].includes(data.type)) {
      if (options) {
        data.options = []
        for (let item of options.split('\n')) {
          if (item.includes(':')) {
            const [value, label] = item.split(':')
            data.options.push({value, label})
          } else {
            data.options.push({value: item, label: item})
          }
        }
      } else {
        return message.error('请输入可选项')
      }
    } else {
      delete data.options
    }
    props.onOk(data)
  }

  return (
    <Modal
      width={600}
      open={props.index !== undefined}
      maskClosable={false}
      title="编辑参数"
      onCancel={props.onCancel}
      onOk={handleSubmit}>
      <Form form={form} labelCol={{span: 6}} wrapperCol={{span: 14}}>
        <Form.Item required name="name" label="参数名" tooltip="参数的简短名称">
          <Input placeholder="请输入参数名称"/>
        </Form.Item>
        <Form.Item required name="variable" label="变量名"
                   tooltip="在脚本使用的变量名称，固定前缀_SPUG_ + 输入的变量名，例如变量名name，则最终生成环境变量为 _SPUG_name">
          <Input placeholder="请输入变量名"/>
        </Form.Item>
        <Form.Item required name="type" label="参数类型" tooltip="不同类型展示的形式不同">
          <Select placeholder="请选择参数类型">
            <Select.Option value="text">单行文本</Select.Option>
            <Select.Option value="textarea">多行文本</Select.Option>
            <Select.Option value="password">密码输入框</Select.Option>
            <Select.Option value="date">日期选择框</Select.Option>
            <Select.Option value="select">下拉单选</Select.Option>
            <Select.Option value="select2">下拉多选</Select.Option>
            <Select.Option value="upload" disabled>上传文件（请使用数据上传控件）</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item noStyle shouldUpdate>
          {({getFieldValue}) =>
            ['select', 'select2'].includes(getFieldValue('type')) ? (
              <Form.Item
                required
                label="可选项"
                tooltip="每项单独一行，每行可以用英文冒号分割前边是值后边是显示的内容">
                <Input.TextArea
                  value={options}
                  autoSize={{minRows: 3, maxRows: 5}}
                  onChange={e => setOptions(e.target.value)}
                  placeholder="每行一个可选项，例如：&#13;&#10;张三&#13;&#10;lisi:李四"/>
              </Form.Item>
            ) : null
          }
        </Form.Item>
        <Form.Item name="required" valuePropName="checked" label="必填" tooltip="该参数是否为必填项">
          <Switch checkedChildren="是" unCheckedChildren="否"/>
        </Form.Item>
        <Form.Item noStyle shouldUpdate>
          {({getFieldValue}) =>
            getFieldValue('type') !== 'date' ? (
              <Form.Item name="default" label="默认值">
                <Input placeholder="请输入"/>
              </Form.Item>
            ) : null
          }
        </Form.Item>
        <Form.Item name="help" label="提示信息" tooltip="会展示类似你现在到这个提示一样">
          <Input placeholder="请输入该参数的帮助提示信息"/>
        </Form.Item>
      </Form>
    </Modal>
  )
}


function Parameter(props) {
  const form = useLocalStore(() => (props.node));
  const [index, setIndex] = useState();

  useEffect(() => {
    props.setHandler(() => handleSave)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // form.resetFields()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.node])

  function handleSave() {
    if (!form.name) return message.error('请输入节点名称')
    if (form.static_params) {
      const params = form.static_params.filter(x => x[0])
      for (let item of params) {
        if (!item[1]) {
          return message.error(`请输入静态参数 ${item[0]} 变量值`)
        }
      }
      form.static_params = params
    }
    return form
  }

  function handleDynamicEdit(data) {
    if (!form.dynamic_params) form.dynamic_params = []
    if (index === -1) {
      form.dynamic_params.push(data)
    } else {
      lds.set(form.dynamic_params, index, data)
    }
    setIndex(undefined)
  }

  function handleStaticAdd() {
    if (!form.static_params) form.static_params = []
    form.static_params.push([])
  }

  function handleStaticEdit(e, idx, subIdx) {
    const params = form.static_params
    const value = e.target.value
    if (subIdx === 0) {
      if (!/^\w+$/.test(value)) {
        return message.error('变量名只能包含字母、数字或下划线')
      }
      lds.set(form.static_params, idx, [value, params[idx][1]])
    } else {
      lds.set(form.static_params, idx, [params[idx][0], value])
    }
  }

  function handleStaticDel(idx) {
    form.static_params.splice(idx, 1)
  }

  function handleDynamicDel(idx) {
    form.dynamic_params.splice(idx, 1)
  }

  return (
    <div className={css.parameter}>
      <div className={css.item}>
        <div className={clsNames(css.title, css.required)}>节点名称</div>
        <Input value={form.name} placeholder="请输入节点名称" onChange={e => form.name = e.target.value}/>
      </div>
      <div className={css.title}>
        <div>动态参数</div>
        <Tooltip title="动态参数会在执行时弹窗提示用户输入，最终生成全局变量">
          <QuestionCircleOutlined/>
        </Tooltip>
      </div>
      <div className={css.body}>
        {(form.dynamic_params ?? []).map((item, idx) => (
          <div key={idx} className={css.row}>
            <div className={clsNames(css.label, item.required && css.required)}>{item.name}</div>
            <Parameter.Component data={item}/>
            <EditOutlined onClick={() => setIndex(idx)}/>
            <Popconfirm title={`确定要删除该参数吗？`} onConfirm={() => handleDynamicDel(idx)}>
              <DeleteOutlined/>
            </Popconfirm>
          </div>
        ))}
        <Button block type="dashed" icon={<PlusOutlined/>} onClick={() => setIndex(-1)}>
          添加参数
        </Button>
      </div>
      <div className={css.title}>
        <div>静态参数</div>
        <Tooltip title="静态参数生成固定的全局变量">
          <QuestionCircleOutlined/>
        </Tooltip>
      </div>
      <div className={css.body}>
        {(form.static_params ?? []).map((item, idx) => (
          <div key={idx} className={css.row}>
            <Input style={{width: 250}} value={item[0]} placeholder="输入变量名"
                   onChange={e => handleStaticEdit(e, idx, 0)}/>
            <div style={{margin: "0 12px"}}>=</div>
            <Input value={item[1]} placeholder="输入变量值" onChange={e => handleStaticEdit(e, idx, 1)}/>
            <Popconfirm title={`确定要删除该参数吗？`} onConfirm={() => handleStaticDel(idx)}>
              <DeleteOutlined/>
            </Popconfirm>
          </div>
        ))}
        <Button block type="dashed" icon={<PlusOutlined/>} onClick={handleStaticAdd}>
          添加参数
        </Button>
      </div>
      <Editor
        index={index}
        params={form.dynamic_params ?? []}
        onOk={handleDynamicEdit}
        onCancel={() => setIndex(undefined)}/>
    </div>
  )
}

Parameter.Component = function (props) {
  const data = props.data
  switch (data.type) {
    case 'password':
      return <Input.Password default={data.default} placeholder="请输入" {...props}/>
    case 'textarea':
      return <Input.TextArea defaultValue={data.default} placeholder="请输入" {...props}/>
    case 'date':
      return <DatePicker style={{width: '100%'}} placeholder="请选择" {...props}/>
    case 'select':
    case 'select2':
      const mode = data.type === 'select2' ? 'multiple' : undefined
      return (
        <Select mode={mode} style={{width: '100%'}} defaultValue={data.default} placeholder="请选择" {...props}>
          {data.options.map((item, idx) => (
            <Select.Option key={idx} value={item.value}>{item.label}</Select.Option>
          ))}
        </Select>
      )
    case 'upload':
      return (
        <Upload><Button icon={<UploadOutlined/>}>点击上传</Button></Upload>
      )
    default:
      return <Input defaultValue={data.default} placeholder="请输入" {...props}/>
  }
}

export default observer(Parameter)