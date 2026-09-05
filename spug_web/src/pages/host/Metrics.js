/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Progress, Tooltip, Space } from 'antd';
import { SyncOutlined, WarningOutlined } from '@ant-design/icons';
import { http, t } from 'libs';

const REFRESH_INTERVAL = 30000;

function strokeColor(percent) {
  if (percent >= 90) return '#d9363e';
  if (percent >= 70) return '#faad14';
  return '#52c41a';
}

function MetricLine(props) {
  const {label, percent, title} = props;
  if (percent === null || percent === undefined) return null;
  return (
    <Tooltip title={title}>
      <div style={{display: 'flex', alignItems: 'center', lineHeight: '16px'}}>
        <span style={{width: 36, fontSize: 11, color: '#888', flexShrink: 0}}>{label}</span>
        <Progress
          percent={percent}
          size="small"
          strokeColor={strokeColor(percent)}
          format={v => <span style={{fontSize: 11}}>{v.toFixed(0)}%</span>}
          style={{width: 100, margin: 0}}/>
      </div>
    </Tooltip>
  )
}

function Metrics(props) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);
  const timer = useRef(null);

  function fetch() {
    http.get('/api/host/metrics/', {params: {id: props.id}, timeout: 30000})
      .then(res => {
        if (!mounted.current) return;
        if (res && res.error) {
          setError(res.error)
        } else {
          setData(res);
          setError(null)
        }
      })
      .catch(e => {
        if (!mounted.current) return;
        setError(typeof e === 'string' ? e : t('采集失败'))
      })
      .finally(() => {
        if (!mounted.current) return;
        setLoading(false);
        timer.current = setTimeout(fetch, REFRESH_INTERVAL)
      })
  }

  useEffect(() => {
    mounted.current = true;
    // 随机延迟 0-2s 启动，避免同屏主机同时并发探测
    timer.current = setTimeout(fetch, Math.random() * 2000);
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.id]);

  if (loading && !data) {
    return <SyncOutlined spin style={{color: '#999'}}/>
  }
  if (error && !data) {
    return (
      <Tooltip title={error}>
        <span style={{color: '#faad14', fontSize: 12}}><WarningOutlined/> {t('不可用')}</span>
      </Tooltip>
    )
  }
  if (!data) return null;

  const disk = (data.disk || []).reduce((a, b) => (b.percent > (a ? a.percent : -1) ? b : a), null);
  const gpu = (data.gpu || []).reduce((a, b) => (b.percent > (a ? a.percent : -1) ? b : a), null);
  return (
    <Space direction="vertical" size={0}>
      <MetricLine label="CPU" percent={data.cpu} title={t('CPU使用率')}/>
      {gpu && (
        <MetricLine
          label="GPU"
          percent={gpu.percent}
          title={`${t('显存')} ${gpu.memory_used}/${gpu.memory_total}GB`}/>
      )}
      {data.memory && (
        <MetricLine
          label={t('内存')}
          percent={data.memory.percent}
          title={`${data.memory.used}/${data.memory.total}GB`}/>
      )}
      {disk && (
        <MetricLine
          label={t('磁盘')}
          percent={disk.percent}
          title={`${disk.mount} ${disk.used}/${disk.total}GB`}/>
      )}
    </Space>
  )
}

export default Metrics
