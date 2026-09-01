/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react';
import { Input, Button, Radio, Select, Empty, Modal, Spin, message } from 'antd';
import { PlusOutlined, DeleteOutlined, SendOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { AuthDiv, Breadcrumb } from 'components';
import { hasPermission, t } from 'libs';
import Metrics from './Metrics';
import Message, { groupRecords } from './Message';
import store from './store';
import styles from './index.module.less';

export default observer(function () {
  const [text, setText] = useState('');
  const bodyRef = useRef(null);

  useEffect(() => {
    store.fetchSessions();
    store.fetchHosts();
    return () => store.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // 新消息或流式增量到达后滚动到底部
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  });

  function handleSend() {
    const question = text.trim();
    if (!question) return;
    if (store.mode === 'agent' && !store.hostId) {
      return message.error(t('Agent 模式请先选择服务器'))
    }
    setText('');
    store.send(question).catch(() => setText(question))
  }

  function handleKeyDown(e) {
    // Enter 发送，Shift+Enter 换行
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!store.sending) handleSend()
    }
  }

  function handleDelete(e, item) {
    e.stopPropagation();
    Modal.confirm({
      title: t('删除确认'),
      content: t('确定要删除【{}】?', item.title),
      onOk: () => store.removeSession(item.id).then(() => message.success(t('删除成功')))
    })
  }

  const current = store.current;
  const groups = current ? groupRecords(current.records) : [];
  const host = store.currentHost;
  return (
    <AuthDiv auth="ai.agent.view">
      <Breadcrumb>
        <Breadcrumb.Item>{t('首页')}</Breadcrumb.Item>
        <Breadcrumb.Item>{t('智能体')}</Breadcrumb.Item>
      </Breadcrumb>
      <div className={styles.container}>
        <div className={styles.sider}>
          <div className={styles.siderHeader}>
            <Button block type="primary" icon={<PlusOutlined/>}
                    disabled={!hasPermission('ai.agent.do')}
                    onClick={() => store.newSession()}>{t('新建会话')}</Button>
            <Input allowClear size="small" style={{marginTop: 8}} placeholder={t('搜索历史会话')}
                   value={store.f_word} onChange={e => store.f_word = e.target.value}/>
          </div>
          <div className={styles.siderList}>
            <Spin spinning={store.isFetching}>
              {store.sessionList.map(item => (
                <div key={item.id}
                     className={`${styles.sessionItem} ${current && current.id === item.id ? styles.sessionActive : ''}`}
                     onClick={() => store.selectSession(item)}>
                  <div className={styles.sessionTitle}>{item.title}</div>
                  <div className={styles.sessionMeta}>
                    {item.mode === 'chat' ? t('问答') : t('Agent')}
                    {item.host_name ? ` · ${item.host_name}` : ''}
                    {item.source === 'monitor' ? ` · ${t('告警')}` : ''}
                  </div>
                  {hasPermission('ai.agent.del') && (
                    <DeleteOutlined className={styles.sessionDel} onClick={e => handleDelete(e, item)}/>
                  )}
                </div>
              ))}
              {store.sessionList.length === 0 && !store.isFetching && (
                <div style={{color: '#bbb', fontSize: 12, textAlign: 'center', marginTop: 20}}>
                  {t('暂无历史会话')}
                </div>
              )}
            </Spin>
          </div>
        </div>

        <div className={styles.main}>
          {store.mode === 'agent' && host && (
            <Metrics hostId={host.id} hostName={`${host.name}（${host.hostname}）`}/>
          )}
          <div className={styles.messages} ref={bodyRef}>
            {groups.length === 0 && !store.streaming ? (
              <div className={styles.empty}>
                <Empty description={t('开始一次新的对话')}/>
              </div>
            ) : groups.map((group, idx) => (
              <Message key={idx} group={group} live={store.sending && idx === groups.length - 1}/>
            ))}
            {store.streaming && (
              <div className={styles.msgRow}>
                <div className={`${styles.bubble} ${styles.bubbleAI}`}>
                  {store.streaming}<span className={styles.caret}/>
                </div>
              </div>
            )}
            {store.pending && (
              <div className={styles.msgRow}>
                <div className={styles.confirmCard}>
                  <div className={styles.confirmTitle}>
                    <ExclamationCircleOutlined style={{color: '#faad14', marginRight: 6}}/>
                    {t('需要你确认后才会执行')}
                  </div>
                  <div className={styles.confirmReason}>{store.pending.reason}</div>
                  <pre className={styles.code}>{store.pending.command}</pre>
                  <div className={styles.confirmActions}>
                    <Button size="small" onClick={() => store.confirm(false)}>{t('拒绝')}</Button>
                    <Button size="small" danger type="primary"
                            onClick={() => store.confirm(true)}>{t('确认执行')}</Button>
                  </div>
                </div>
              </div>
            )}
            {store.sending && !store.streaming && !store.pending && (
              <div className={styles.msgRow}>
                <div className={`${styles.bubble} ${styles.bubbleAI}`}>
                  <Spin size="small"/> <span style={{marginLeft: 8}}>{t('思考中...')}</span>
                </div>
              </div>
            )}
          </div>

          <div className={styles.inputArea}>
            <Input.TextArea
              rows={3}
              value={text}
              disabled={store.sending}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={store.mode === 'agent'
                ? t('描述你要在服务器上完成的任务，例如：检查 8000 端口服务是否正常')
                : t('输入你的运维问题，Enter 发送，Shift+Enter 换行')}/>
            <div className={styles.toolbar}>
              <Radio.Group size="small" buttonStyle="solid" value={store.mode}
                           onChange={e => store.mode = e.target.value}>
                <Radio.Button value="chat">{t('问答')}</Radio.Button>
                <Radio.Button value="agent">{t('Agent')}</Radio.Button>
              </Radio.Group>
              <Select
                allowClear
                showSearch
                size="small"
                style={{width: 260}}
                optionFilterProp="children"
                value={store.hostId}
                disabled={store.mode === 'chat'}
                placeholder={store.mode === 'chat' ? t('问答模式无需选择服务器') : t('请选择服务器')}
                onChange={v => store.hostId = v}>
                {store.hosts.map(item => (
                  <Select.Option key={item.id} value={item.id}>{item.name}（{item.hostname}）</Select.Option>
                ))}
              </Select>
              <span className={styles.tip}>
                {store.mode === 'agent'
                  ? t('Agent 可执行命令操作服务器，已内置高危命令拦截')
                  : t('问答模式仅提供建议，不会操作服务器')}
              </span>
              <Button type="primary" icon={<SendOutlined/>} loading={store.sending}
                      disabled={!hasPermission('ai.agent.do')}
                      onClick={handleSend}>{t('发送')}</Button>
            </div>
          </div>
        </div>
      </div>
    </AuthDiv>
  );
})
