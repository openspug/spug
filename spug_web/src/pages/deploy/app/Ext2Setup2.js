/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Form, Input, Button, message, Divider, Alert, Select } from 'antd';
import { ACEditor } from 'components';
import styles from './index.module.css';
import { http, cleanCommand } from 'libs';
import Tips from './Tips';
import store from './store';
import lds from 'lodash';

@observer
class Ext2Setup2 extends React.Component {
  constructor(props) {
    super(props);
    this.helpMap = {
      '0': null,
      '1': '相对于输入的本地路径的文件路径，仅将匹配到文件传输至要发布的目标主机。',
      '2': '支持模糊匹配，如果路径以 / 开头则基于输入的本地路径匹配，匹配到文件将不会被传输。'
    }
    this.state = {
      loading: false,
    }
  }

  handleSubmit = () => {
    this.setState({loading: true});
    const info = store.deploy;
    info['app_id'] = store.app_id;
    info['extend'] = '2';
    info['host_actions'] = info['host_actions'].filter(x => (x.title && x.data) || (x.title && (x.src || x.src_mode === '1') && x.dst));
    info['server_actions'] = info['server_actions'].filter(x => x.title && x.data);
    http.post('/api/app/deploy/', info)
      .then(res => {
        message.success('保存成功');
        store.ext2Visible = false;
        store.loadDeploys(store.app_id)
      }, () => this.setState({loading: false}))
  };

  render() {
    const server_actions = store.deploy['server_actions'];
    const host_actions = store.deploy['host_actions'];
    return (
      <Form labelCol={{span: 6}} wrapperCol={{span: 14}} className={styles.ext2Form}>
        {store.deploy.id === undefined && (
          <Alert
            closable
            showIcon
            type="info"
            message="小提示"
            style={{margin: '0 80px 20px'}}
            description={[
              <p key={1}>Spug 将遵循先本地后目标主机的原则，按照顺序依次执行添加的动作，例如：本地动作1 -> 本地动作2 -> 目标主机动作1 -> 目标主机动作2 ...</p>,
              <p key={2}>执行的命令内可以使用发布申请中设置的环境变量 SPUG_RELEASE，一般可用于标记一次发布的版本号或提交ID等，在执行的脚本内通过使用 $SPUG_RELEASE
                获取其值来执行相应操作。</p>,
              <p key={3}>{Tips}。</p>
            ]}/>
        )}
        {server_actions.map((item, index) => (
          <div key={index} style={{marginBottom: 30, position: 'relative'}}>
            <Form.Item required label={`本地动作${index + 1}`}>
              <Input disabled={store.isReadOnly} value={item['title']} onChange={e => item['title'] = e.target.value}
                     placeholder="请输入"/>
            </Form.Item>

            <Form.Item required label="执行内容">
              <ACEditor
                readOnly={store.isReadOnly}
                mode="sh"
                theme="tomorrow"
                width="100%"
                height="100px"
                value={item['data']}
                onChange={v => item['data'] = cleanCommand(v)}
                placeholder="请输入要执行的动作"/>
            </Form.Item>
            {!store.isReadOnly && (
              <div className={styles.delAction} onClick={() => server_actions.splice(index, 1)}>
                <MinusCircleOutlined />移除
              </div>
            )}
          </div>
        ))}
        {!store.isReadOnly && (
          <Form.Item wrapperCol={{span: 14, offset: 6}}>
            <Button type="dashed" block onClick={() => server_actions.push({})}>
              <PlusOutlined />添加本地执行动作（在服务端本地执行）
            </Button>
          </Form.Item>
        )}
        <Divider/>
        {host_actions.map((item, index) => (
          <div key={index} style={{marginBottom: 30, position: 'relative'}}>
            <Form.Item required label={`目标主机动作${index + 1}`}>
              <Input disabled={store.isReadOnly} value={item['title']} onChange={e => item['title'] = e.target.value}
                     placeholder="请输入"/>
            </Form.Item>
            {item['type'] === 'transfer' ? ([
              <Form.Item key={0} required label="数据来源">
                <Input
                  spellCheck={false}
                  disabled={store.isReadOnly || item['src_mode'] === '1'}
                  placeholder="请输入本地（部署spug的容器或主机）路径"
                  value={item['src']}
                  onChange={e => item['src'] = e.target.value}
                  addonBefore={(
                    <Select disabled={store.isReadOnly} style={{width: 120}} value={item['src_mode'] || '0'}
                            onChange={v => item['src_mode'] = v}>
                      <Select.Option value="0">本地路径</Select.Option>
                      <Select.Option value="1">发布时上传</Select.Option>
                    </Select>
                  )}/>
              </Form.Item>,
              [undefined, '0'].includes(item['src_mode']) ? (
                <Form.Item key={1} label="过滤规则" extra={this.helpMap[item['mode']]}>
                  <Input
                    spellCheck={false}
                    placeholder="请输入逗号分割的过滤规则"
                    value={item['rule']}
                    onChange={e => item['rule'] = e.target.value.replace('，', ',')}
                    disabled={store.isReadOnly || item['mode'] === '0'}
                    addonBefore={(
                      <Select disabled={store.isReadOnly} style={{width: 120}} value={item['mode']}
                              onChange={v => item['mode'] = v}>
                        <Select.Option value="0">关闭</Select.Option>
                        <Select.Option value="1">包含</Select.Option>
                        <Select.Option value="2">排除</Select.Option>
                      </Select>
                    )}/>
                </Form.Item>
              ) : null,
              <Form.Item key={2} required label="目标路径" extra={<a
                target="_blank" rel="noopener noreferrer"
                href="https://spug.cc/docs/deploy-config#%E6%95%B0%E6%8D%AE%E4%BC%A0%E8%BE%93">使用前请务必阅读官方文档。</a>}>
                <Input
                  disabled={store.isReadOnly}
                  spellCheck={false}
                  value={item['dst']}
                  placeholder="请输入目标主机路径"
                  onChange={e => item['dst'] = e.target.value}/>
              </Form.Item>
            ]) : (
              <Form.Item required label="执行内容">
                <ACEditor
                  readOnly={store.isReadOnly}
                  mode="sh"
                  theme="tomorrow"
                  width="100%"
                  height="100px"
                  value={item['data']}
                  onChange={v => item['data'] = cleanCommand(v)}
                  placeholder="请输入要执行的动作"/>
              </Form.Item>
            )}
            {!store.isReadOnly && (
              <div className={styles.delAction} onClick={() => host_actions.splice(index, 1)}>
                <MinusCircleOutlined />移除
              </div>
            )}
          </div>
        ))}
        {!store.isReadOnly && (
          <Form.Item wrapperCol={{span: 14, offset: 6}}>
            <Button disabled={store.isReadOnly} type="dashed" block onClick={() => host_actions.push({})}>
              <PlusOutlined />添加目标主机执行动作（在部署目标主机执行）
            </Button>
            <Button
              block
              type="dashed"
              style={{marginTop: 8}}
              disabled={store.isReadOnly || lds.findIndex(host_actions, x => x.type === 'transfer') !== -1}
              onClick={() => host_actions.push({type: 'transfer', title: '数据传输', mode: '0', src_mode: '0'})}>
              <PlusOutlined />添加数据传输动作（仅能添加一个）
            </Button>
          </Form.Item>
        )}
        <Form.Item wrapperCol={{span: 14, offset: 6}} style={{marginTop: 24}}>
          <Button
            type="primary"
            disabled={store.isReadOnly || [...host_actions, ...server_actions].filter(x => x.title && x.data).length === 0}
            loading={this.state.loading}
            onClick={this.handleSubmit}>提交</Button>
          <Button style={{marginLeft: 20}} onClick={() => store.page -= 1}>上一步</Button>
        </Form.Item>
      </Form>
    )
  }
}

export default Ext2Setup2
