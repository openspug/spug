import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Button, Checkbox, Empty, Modal, Select, Space, Spin, Table, Tabs, Tag, Tooltip, message,
} from 'antd';
import {
  CaretRightOutlined, DeleteOutlined, DockerOutlined, FileTextOutlined, PlusOutlined, RedoOutlined,
  ReloadOutlined, SaveOutlined, StopOutlined,
} from '@ant-design/icons';
import { ACEditor } from 'components';
import { hasPermission, http, t } from 'libs';
import CreateProject from './CreateProject';
import Resources from './Resources';
import styles from './index.module.less';


// 主机级资源，与 compose 项目并列展示，不依赖任何项目选中状态。
const RESOURCE_TABS = [
  {key: 'images', label: '镜像'},
  {key: 'networks', label: '网络'},
  {key: 'volumes', label: '存储卷'},
];

function projectKey(item) {
  return `${item.name}|${item.workdir}|${item.config_file}`;
}

export default function DockerConsole() {
  const [hosts, setHosts] = useState([]);
  const [hostId, setHostId] = useState();
  const [projects, setProjects] = useState([]);
  const [activeKey, setActiveKey] = useState();
  const [fetching, setFetching] = useState(false);
  const [running, setRunning] = useState('');
  const [configLoading, setConfigLoading] = useState(false);
  const [configContent, setConfigContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [selectedFile, setSelectedFile] = useState();
  const [logs, setLogs] = useState('');
  const [logService, setLogService] = useState();
  const [tail, setTail] = useState(200);
  const [activeTab, setActiveTab] = useState(hasPermission('docker.project.edit') ? 'compose' : 'logs');
  const [createOpen, setCreateOpen] = useState(false);
  // 'project' 表示 compose 项目视图，其余为主机级资源视图（镜像/网络/存储卷）。
  const [view, setView] = useState('project');
  const discoverSeq = useRef(0);
  const configSeq = useRef(0);
  const logsSeq = useRef(0);
  const configCache = useRef({});
  const active = projects.find(item => projectKey(item) === activeKey);
  const writeBusy = Boolean(running && !running.startsWith('logs:'));

  useEffect(() => {
    document.title = 'Spug Docker';
    http.get('/api/host/').then(setHosts);
  }, []);

  useEffect(() => {
    if (hostId !== undefined) discover(hostId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostId]);

  useEffect(() => {
    if (!active) {
      setConfigContent('');
      setSavedContent('');
      return;
    }
    setSelectedFile(active.config_file);
    setLogs('');
    setLogService(undefined);
    if (hasPermission('docker.project.edit')) loadConfig(active, active.config_file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  function discover(targetHostId = hostId, preferredKey, silent = false) {
    const seq = ++discoverSeq.current;
    setFetching(true);
    if (!silent) {
      // 静默刷新用于操作后同步状态：保留列表可以避免整页闪烁重排。
      setProjects([]);
      setActiveKey(undefined);
      setConfigContent('');
      setLogs('');
    }
    return http.post('/api/docker/discover/', {host_id: targetHostId}, {timeout: 70000})
      .then(items => {
        if (seq !== discoverSeq.current) return;
        setProjects(items);
        const wanted = preferredKey || activeKey;
        const next = items.find(item => projectKey(item) === wanted) || (silent ? null : items[0]);
        if (next) setActiveKey(projectKey(next));
        else if (!silent) setActiveKey(undefined);
      })
      .finally(() => {
        if (seq === discoverSeq.current) setFetching(false);
      });
  }

  function target(project = active, file = selectedFile) {
    return {
      host_id: hostId,
      project: project.name,
      config_file: file || project.config_file,
    };
  }

  function loadConfig(project = active, file = selectedFile, force = false) {
    if (!project || !file) return;
    const cached = configCache.current[file];
    if (cached !== undefined && !force) {
      // 读取远程配置需要数秒，命中缓存可让来回切换项目保持即时响应。
      setConfigContent(cached);
      setSavedContent(cached);
      setConfigLoading(false);
      return;
    }
    const seq = ++configSeq.current;
    setConfigLoading(true);
    http.get('/api/docker/config/', {params: target(project, file)})
      .then(data => {
        if (seq !== configSeq.current) return;
        const content = data.content || '';
        configCache.current[file] = content;
        setConfigContent(content);
        setSavedContent(content);
      })
      .finally(() => {
        if (seq === configSeq.current) setConfigLoading(false);
      });
  }

  function selectConfig(file) {
    if (configContent !== savedContent) {
      Modal.confirm({
        title: t('存在未保存修改'),
        content: t('切换配置文件会丢弃当前修改，确认继续？'),
        onOk: () => {
          setSelectedFile(file);
          loadConfig(active, file);
        },
      });
      return;
    }
    setSelectedFile(file);
    loadConfig(active, file);
  }

  function saveConfig() {
    setRunning('save');
    http.post('/api/docker/config/', {...target(), content: configContent})
      .then(() => {
        configCache.current[selectedFile] = configContent;
        setSavedContent(configContent);
        message.success(t('Compose 配置已校验并保存'));
      })
      .finally(() => setRunning(''));
  }

  function removeProject() {
    let deleteFiles = false;
    Modal.confirm({
      title: t('删除项目【{}】', active.name),
      okText: t('删除'),
      okButtonProps: {danger: true},
      content: (
        <div>
          <p>{t('将执行 docker compose down --volumes，停止并移除该项目的容器、网络和数据卷。')}</p>
          <Checkbox onChange={event => { deleteFiles = event.target.checked; }}>
            {t('同时删除服务器上的 compose 配置文件')}
          </Checkbox>
        </div>
      ),
      onOk: () => {
        setRunning('remove:');
        return http.post('/api/docker/remove/', {
          ...target(), delete_files: deleteFiles,
        }, {timeout: 620000})
          .then(() => {
            message.success(t('项目已删除'));
            setActiveKey(undefined);
            setLogs('');
            return discover(hostId);
          })
          .finally(() => setRunning(''));
      },
    });
  }

  function action(actionName, service) {
    const executeAction = () => {
      setRunning(`${actionName}:${service || ''}`);
      const seq = ++logsSeq.current;
      const requestKey = activeKey;
      return http.post('/api/docker/action/', {
        ...target(), action: actionName, service, tail,
      }, {timeout: 920000})
        .then(data => {
          if (actionName === 'logs') {
            // 丢弃过期响应：连续点击不同服务时，早发出的请求可能后返回。
            if (seq !== logsSeq.current || requestKey !== activeKey) return;
            setLogs(data.output || '');
          } else {
            message.success(t('操作成功'));
            return discover(hostId, activeKey, true);
          }
        })
        .finally(() => setRunning(''));
    };
    if (actionName === 'down') {
      Modal.confirm({
        title: t('停止并移除项目容器'),
        content: t('将执行 docker compose down，确认继续？'),
        okButtonProps: {danger: true},
        onOk: executeAction,
      });
      return;
    }
    executeAction();
  }

  function selectProject(item) {
    if (configContent !== savedContent) {
      Modal.confirm({
        title: t('存在未保存修改'),
        content: t('切换项目会丢弃当前修改，确认继续？'),
        onOk: () => { setView('project'); setActiveKey(projectKey(item)); },
      });
      return;
    }
    setView('project');
    setActiveKey(projectKey(item));
  }

  function changeHost(value) {
    const apply = () => {
      configCache.current = {};
      setView('project');
      setHostId(value);
    };
    if (configContent !== savedContent) {
      Modal.confirm({
        title: t('存在未保存修改'),
        content: t('切换服务器会丢弃当前修改，确认继续？'),
        onOk: apply,
      });
      return;
    }
    apply();
  }

  function refreshProjects() {
    const run = () => {
      configCache.current = {};
      discover(hostId, activeKey);
    };
    if (configContent !== savedContent) {
      Modal.confirm({
        title: t('存在未保存修改'),
        content: t('刷新会丢弃当前修改，确认继续？'),
        onOk: run,
      });
      return;
    }
    run();
  }

  const columns = [
    {title: t('服务'), dataIndex: 'service', width: 150, render: value => <strong>{value}</strong>},
    {title: t('容器'), dataIndex: 'name', ellipsis: true},
    {title: t('镜像'), dataIndex: 'image', ellipsis: true},
    {title: t('状态'), dataIndex: 'state', width: 110, render: value => <Tag color={value === 'running' ? 'green' : 'red'}>{value}</Tag>},
    {title: t('端口'), dataIndex: 'ports', width: 200, render: value => value?.join(', ') || '-'},
    {title: t('操作'), width: 170, render: (_, item) => (
      <Space size={4}>
        <Tooltip title={t('查看日志')}><Button type="text" icon={<FileTextOutlined/>} onClick={() => {
          setActiveTab('logs');
          setLogService(item.service);
          action('logs', item.service);
        }}/></Tooltip>
        <Tooltip title={t('重启')}><Button type="text" icon={<RedoOutlined/>} disabled={writeBusy || !hasPermission('docker.project.do')} onClick={() => action('restart', item.service)}/></Tooltip>
        <Tooltip title={t('重新构建')}><Button type="text" icon={<DockerOutlined/>} disabled={writeBusy || !hasPermission('docker.project.do')} onClick={() => action('rebuild', item.service)}/></Tooltip>
      </Space>
    )},
  ];

  const tabItems = [];
  if (hasPermission('docker.project.edit')) {
    tabItems.push({key: 'compose', label: 'Docker Compose', children: (
      <Spin spinning={configLoading}>
        <div className={styles.configBar}>
          <Select value={selectedFile} style={{minWidth: 360, maxWidth: '70%'}}
                  options={(active?.config_files || []).map(file => ({value: file, label: file}))}
                  onChange={selectConfig}/>
          <Space>
            <Button icon={<ReloadOutlined/>} onClick={() => loadConfig(active, selectedFile, true)}>{t('重新读取')}</Button>
            <Button type="primary" icon={<SaveOutlined/>} loading={running === 'save'}
                    disabled={writeBusy || configContent === savedContent} onClick={saveConfig}>{t('保存配置')}</Button>
          </Space>
        </div>
        <ACEditor mode="text" theme="one_dark" value={configContent}
                  width="100%" height="360px" showPrintMargin={false} onChange={setConfigContent}/>
      </Spin>
    )});
  }
  tabItems.push({key: 'logs', label: t('日志'), children: (
    <div className={styles.logs}>
      <div className={styles.logToolbar}>
        <Select allowClear value={logService} style={{width: 180}} placeholder={t('全部服务')}
                onChange={value => { setLogService(value); setLogs(''); }}
                options={(active?.containers || []).map(item => ({value: item.service, label: item.service}))}/>
        <Select value={tail} style={{width: 130}} onChange={setTail}
                options={[100, 200, 500, 1000, 2000].map(value => ({value, label: `${value} lines`}))}/>
        <Button icon={<ReloadOutlined/>} loading={running.startsWith('logs:')}
                onClick={() => action('logs', logService)}>{t('加载日志')}</Button>
      </div>
      <pre>{logs || t('选择服务并加载日志')}</pre>
    </div>
  )});

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}><div><DockerOutlined/> Docker</div></div>
        <Select className={styles.hostSelect} value={hostId} placeholder={t('选择服务器')}
                onChange={changeHost}>
          {hosts.map(host => <Select.Option key={host.id} value={host.id}>{host.name} ({host.hostname})</Select.Option>)}
        </Select>
        <div className={styles.listHeader}>
          <span>{t('项目')}</span>
          <Space size={2}>
            {hasPermission('docker.project.add') && (
              <Button type="text" size="small" icon={<PlusOutlined/>} disabled={!hostId}
                      title={t('新建项目')} onClick={() => setCreateOpen(true)}/>
            )}
            <Button type="text" size="small" icon={<ReloadOutlined/>} loading={fetching} onClick={refreshProjects}/>
          </Space>
        </div>
        <Spin spinning={fetching}>
          <div className={styles.projectList}>
            {projects.map(item => (
              <button key={projectKey(item)} className={projectKey(item) === activeKey ? styles.activeProject : styles.project}
                      onClick={() => selectProject(item)}>
                <span>{item.name}</span><small>{item.containers.length} containers · {item.workdir}</small>
              </button>
            ))}
            {!fetching && !projects.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('该服务器暂无项目')}/>} 
          </div>
        </Spin>
        <div className={styles.listHeader}><span>{t('主机资源')}</span></div>
        <div className={styles.resourceNav}>
          {RESOURCE_TABS.map(item => (
            <button key={item.key} disabled={!hostId}
                    className={view === item.key ? styles.activeProject : styles.project}
                    onClick={() => setView(item.key)}>
              <span>{t(item.label)}</span>
            </button>
          ))}
        </div>
      </aside>
      <main className={styles.content}>
        {view !== 'project' ? (
          <>
            <header className={styles.header}>
              <div>
                <h2>{t(RESOURCE_TABS.find(item => item.key === view).label)}</h2>
                <span>{hosts.find(item => item.id === hostId)?.name}</span>
              </div>
              <Space>
                <Button onClick={() => setView('project')}>{t('返回项目')}</Button>
              </Space>
            </header>
            <section className={styles.resourcePanel}>
              <Resources kind={view} hostId={hostId}/>
            </section>
          </>
        ) : !active ? <Empty description={hostId === undefined ? t('请先选择服务器') : t('请选择项目')}/> : (
          <>
            <header className={styles.header}>
              <div><h2>{active.name}</h2><span>{active.workdir}</span></div>
              <Space>
                <Button icon={<ReloadOutlined/>} loading={fetching} onClick={refreshProjects}>{t('刷新')}</Button>
                {hasPermission('docker.project.del') && (
                  <Button danger icon={<DeleteOutlined/>} loading={running.startsWith('remove:')}
                          disabled={writeBusy} onClick={removeProject}>{t('删除项目')}</Button>
                )}
              </Space>
            </header>
            <section className={styles.toolbar}>
              <Space wrap>
                <Button type="primary" icon={<CaretRightOutlined/>} loading={running.startsWith('publish:')}
                        disabled={writeBusy || !hasPermission('docker.project.do')} onClick={() => action('publish')}>{t('拉取并发布')}</Button>
                <Button icon={<DockerOutlined/>} loading={running.startsWith('rebuild:')}
                        disabled={writeBusy || !hasPermission('docker.project.do')} onClick={() => action('rebuild')}>{t('全部重建')}</Button>
                <Button icon={<RedoOutlined/>} loading={running.startsWith('restart:')}
                        disabled={writeBusy || !hasPermission('docker.project.do')} onClick={() => action('restart')}>{t('重启项目')}</Button>
                <Button danger icon={<StopOutlined/>} disabled={writeBusy || !hasPermission('docker.project.do')}
                        onClick={() => action('stop')}>{t('停止项目')}</Button>
              </Space>
            </section>
            <section className={styles.containers}>
              <Table size="small" rowKey="name" pagination={false} columns={columns}
                     dataSource={active.containers} scroll={{x: 900}}/>
            </section>
            {!hasPermission('docker.project.edit') && (
              <Alert type="info" showIcon message={t('当前角色仅可查看容器状态和日志')}/>
            )}
            <section className={styles.editorArea}>
              <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems}/>
            </section>
          </>
        )}
      </main>
      <CreateProject open={createOpen} hostId={hostId} onClose={() => setCreateOpen(false)}
                     onCreated={result => {
                       setCreateOpen(false);
                       discover(hostId, `${result.name}|${result.workdir}|${result.config_file}`);
                     }}/>
    </div>
  );
}
