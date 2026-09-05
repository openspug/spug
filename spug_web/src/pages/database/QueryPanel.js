import React, { useRef, useState } from 'react';
import { Alert, Button, Empty, Space, Table, Tag, Tooltip, message } from 'antd';
import {
  CaretRightOutlined,
  ClearOutlined,
  CopyOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { ACEditor } from 'components';
import { hasPermission, http, t } from 'libs';
import styles from './index.module.less';


const INITIAL_COMMAND = {
  mysql: 'SELECT VERSION();',
  mariadb: 'SELECT VERSION();',
  postgresql: 'SELECT version();',
  clickhouse: 'SELECT version();',
  redis: 'PING',
};

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export default function QueryPanel({connection, command, onCommandChange}) {
  const editorRef = useRef();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState();
  const value = command === undefined ? INITIAL_COMMAND[connection.type] : command;

  function selectedCommand() {
    const selected = editorRef.current?.editor?.getSelectedText();
    return selected?.trim() || value?.trim();
  }

  function run() {
    const statement = selectedCommand();
    if (!statement) {
      message.warning(t('请输入要执行的命令'));
      return;
    }
    setRunning(true);
    http.post('/api/database/execute/', {id: connection.id, command: statement}, {timeout: 45000})
      .then(setResult)
      .finally(() => setRunning(false));
  }

  function clear() {
    onCommandChange('');
    setResult(undefined);
    if (editorRef.current?.editor) editorRef.current.editor.focus();
  }

  function resultCsv() {
    if (!result?.columns?.length) return '';
    return [result.columns, ...result.rows]
      .map(row => row.map(csvCell).join(','))
      .join('\n');
  }

  function copyResult() {
    navigator.clipboard.writeText(resultCsv())
      .then(() => message.success(t('结果已复制')));
  }

  function downloadResult() {
    const blob = new Blob(['\ufeff', resultCsv()], {type: 'text/csv;charset=utf-8'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${connection.name}-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const columns = (result?.columns || []).map((title, index) => ({
    title,
    dataIndex: index,
    key: `${title}-${index}`,
    ellipsis: true,
    width: Math.max(140, Math.min(320, String(title).length * 14 + 48)),
    render: cell => cell === null ? <span className={styles.nullValue}>NULL</span> : String(cell),
  }));
  const rows = (result?.rows || []).map((row, index) => ({...row, key: index}));
  const hasRows = Boolean(result?.columns?.length);

  return (
    <div className={styles.queryPanel}>
      <div className={styles.queryHeader}>
        <div className={styles.connectionSummary}>
          <span className={styles.connectionStatus}/>
          <div>
            <div className={styles.connectionTitle}>{connection.name}</div>
            <div className={styles.endpoint}>
              {connection.username ? `${connection.username}@` : ''}{connection.host}:{connection.port}
              {connection.database ? ` / ${connection.database}` : ''}
            </div>
          </div>
          <Tag className={styles.engineTag}>{connection.type_alias}</Tag>
        </div>
        <Space size={8}>
          <Tooltip title={t('清空编辑器和结果')}>
            <Button icon={<ClearOutlined/>} onClick={clear}/>
          </Tooltip>
          <Tooltip title={t('有选中内容时仅运行选中内容')}>
            <Button type="primary" icon={<CaretRightOutlined/>} loading={running}
                    disabled={!hasPermission('database.query.do')} onClick={run}>
              {t('运行')}
            </Button>
          </Tooltip>
        </Space>
      </div>

      <div className={styles.editorShell}>
        <div className={styles.editorCaption}>
          <span>{connection.type === 'redis' ? t('命令编辑器') : 'SQL Editor'}</span>
          <span>{connection.type === 'redis' ? 'Redis CLI' : connection.type_alias}</span>
        </div>
        <ACEditor
          editorRef={editorRef}
          mode={connection.type === 'redis' ? 'text' : 'sql'}
          theme="one_dark"
          value={value}
          width="100%"
          height="calc(100% - 32px)"
          fontSize={14}
          showPrintMargin={false}
          highlightActiveLine
          setOptions={{
            useWorker: false,
            showLineNumbers: true,
            showGutter: true,
            displayIndentGuides: true,
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true,
          }}
          commands={[{
            name: 'execute',
            bindKey: {win: 'Ctrl-Enter', mac: 'Command-Enter'},
            exec: run,
          }]}
          onChange={onCommandChange}/>
      </div>

      <div className={styles.resultBar}>
        <div className={styles.resultTitle}>
          <span>{t('结果')}</span>
          {result && (
            <React.Fragment>
              <span className={styles.resultDivider}/>
              <span>{result.elapsed} ms</span>
              <span>{hasRows ? `${result.rows.length} ${t('行')}` : `${t('影响')} ${result.affected} ${t('行')}`}</span>
              {result.truncated && <Tag color="orange">{t('已截断')}</Tag>}
            </React.Fragment>
          )}
        </div>
        {hasRows && (
          <Space size={4}>
            <Tooltip title={t('复制为 CSV')}>
              <Button type="text" size="small" icon={<CopyOutlined/>} onClick={copyResult}/>
            </Tooltip>
            <Tooltip title={t('下载 CSV')}>
              <Button type="text" size="small" icon={<DownloadOutlined/>} onClick={downloadResult}/>
            </Tooltip>
          </Space>
        )}
      </div>

      <div className={styles.result}>
        {!result ? (
          <div className={styles.resultEmpty}>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('运行命令后在这里查看结果')}/>
          </div>
        ) : hasRows ? (
          <React.Fragment>
            {result.truncated && (
              <Alert className={styles.resultAlert} type="warning" showIcon banner
                     message={t('结果超过 1000 行，仅展示前 1000 行')}/>
            )}
            <Table className={styles.resultTable} size="small" pagination={false}
                   columns={columns} dataSource={rows}
                   scroll={{x: 'max-content', y: 'calc(100vh - 492px)'}}/>
          </React.Fragment>
        ) : (
          <div className={styles.executionMessage}>
            <Alert type="success" showIcon message={result.message || t('执行成功')}
                   description={`${t('影响行数')}: ${result.affected} · ${t('耗时')}: ${result.elapsed} ms`}/>
          </div>
        )}
      </div>
    </div>
  );
}
