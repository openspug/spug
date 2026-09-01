/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState } from 'react';
import { Tag } from 'antd';
import { RightOutlined, DownOutlined } from '@ant-design/icons';
import { t } from 'libs';
import styles from './index.module.less';

const TRACE_KINDS = ['thought', 'command', 'confirm', 'output', 'verify', 'context',
  'skill', 'tool', 'tool_result', 'compress', 'error'];

const kindColor = {
  thought: 'blue',
  command: 'orange',
  confirm: 'gold',
  output: 'default',
  verify: 'purple',
  context: 'default',
  skill: 'cyan',
  tool: 'geekblue',
  tool_result: 'default',
  compress: 'magenta',
  error: 'red',
};

// 把顺序记录聚合成气泡：question/answer 为对话气泡，
// 其间的执行细节归入紧随其后的一次「执行过程」折叠块。
export function groupRecords(records) {
  const groups = [];
  let trace = [];
  for (let item of records || []) {
    if (item.kind === 'question') {
      if (trace.length) {
        groups.push({type: 'trace', items: trace});
        trace = []
      }
      groups.push({type: 'question', item})
    } else if (item.kind === 'answer' || item.kind === 'summary') {
      if (trace.length) {
        groups.push({type: 'trace', items: trace});
        trace = []
      }
      groups.push({type: 'answer', item})
    } else if (TRACE_KINDS.includes(item.kind)) {
      trace.push(item)
    }
  }
  if (trace.length) groups.push({type: 'trace', items: trace});
  return groups
}

function Trace(props) {
  // 执行中默认展开，便于实时观察；结束后折叠，保持对话主线清爽
  const [open, setOpen] = useState(!!props.live);
  const items = props.items;
  const cmdCount = items.filter(x => x.kind === 'command').length;
  return (
    <div className={styles.msgRow}>
      <div className={styles.trace}>
        <div className={styles.traceHeader} onClick={() => setOpen(!open)}>
          {open ? <DownOutlined/> : <RightOutlined/>}
          <span style={{marginLeft: 6}}>
            {t('执行过程')}（{t('{} 条命令', cmdCount)}）
          </span>
        </div>
        {open && (
          <div className={styles.traceBody}>
            {items.map(item => (
              <div key={item.id} className={styles.traceItem}>
                <div>
                  <Tag color={kindColor[item.kind]}>{item.kind_alias}</Tag>
                  {item.extra && item.extra.exit_code !== undefined && (
                    <span style={{fontSize: 12, color: item.extra.exit_code === 0 ? '#52c41a' : '#d9363e'}}>
                      exit={item.extra.exit_code}
                    </span>
                  )}
                  {item.extra && item.extra.rejected && (
                    <Tag color="red">{item.extra.rejected}</Tag>
                  )}
                </div>
                <pre className={styles.code}>{item.content || '(无输出)'}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Message(props) {
  const {group} = props;
  if (group.type === 'trace') return <Trace items={group.items} live={props.live}/>;
  const isUser = group.type === 'question';
  return (
    <div className={`${styles.msgRow} ${isUser ? styles.msgRowUser : ''}`}>
      <div className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleAI}`}>
        {group.item.content}
      </div>
    </div>
  )
}
