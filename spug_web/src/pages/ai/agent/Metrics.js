/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Progress, Tooltip, Tag } from 'antd';
import { SyncOutlined, WarningOutlined, CloudServerOutlined } from '@ant-design/icons';
import { http, t } from 'libs';
import styles from './index.module.less';

const REFRESH_INTERVAL = 5000;
// 网络速率走独立的轻量接口（服务端读缓存，无 SSH 开销），可以放心秒级刷新
const NET_REFRESH_INTERVAL = 1000;

function strokeColor(percent) {
  if (percent >= 90) return '#d9363e';
  if (percent >= 70) return '#faad14';
  return '#52c41a';
}

function fmtSpeed(kb) {
  if (kb === null || kb === undefined) return '-';
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)}MB/s`;
  return `${kb.toFixed(0)}KB/s`
}

function Item(props) {
  const {label, percent, title} = props;
  if (percent === null || percent === undefined) return null;
  return (
    <Tooltip title={title}>
      <div className={styles.metricItem}>
        <span className={styles.metricLabel}>{label}</span>
        <Progress
          percent={percent}
          size="small"
          strokeColor={strokeColor(percent)}
          format={v => <span style={{fontSize: 11}}>{v.toFixed(0)}%</span>}
          style={{width: 110, margin: 0}}/>
      </div>
    </Tooltip>
  )
}

export default function Metrics(props) {
  const [data, setData] = useState(null);
  const [netData, setNetData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);
  const timer = useRef(null);
  const netTimer = useRef(null);

  useEffect(() => {
    mounted.current = true;
    setData(null);
    setError(null);
    setLoading(true);

    function fetch() {
      http.get('/api/host/metrics/', {params: {id: props.hostId}, timeout: 30000})
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

    fetch();
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current)
    }
  }, [props.hostId]);

  useEffect(() => {
    setNetData(null);

    function fetchNet() {
      http.get('/api/host/metrics/net/', {params: {id: props.hostId}, timeout: 10000})
        .then(res => {
          if (!mounted.current) return;
          setNetData(res || null)
        })
        .catch(() => {})
        .finally(() => {
          if (!mounted.current) return;
          netTimer.current = setTimeout(fetchNet, NET_REFRESH_INTERVAL)
        })
    }

    fetchNet();
    return () => {
      if (netTimer.current) clearTimeout(netTimer.current)
    }
  }, [props.hostId]);

  const disk = data && (data.disk || []).reduce((a, b) => (b.percent > (a ? a.percent : -1) ? b : a), null);
  const gpu = data && (data.gpu || []).reduce((a, b) => (b.percent > (a ? a.percent : -1) ? b : a), null);
  // 秒级采样优先；冷启动的头 1~2 秒回退到全量探针里的差值网速
  const network = netData || (data && data.network);
  return (
    <div className={styles.metrics}>
      <Tag icon={<CloudServerOutlined/>} color="blue">{props.hostName}</Tag>
      {loading && !data && <span style={{color: '#999', fontSize: 12}}><SyncOutlined spin/> {t('采集中')}</span>}
      {error && !data && (
        <Tooltip title={error}>
          <span style={{color: '#faad14', fontSize: 12}}><WarningOutlined/> {t('指标不可用')}</span>
        </Tooltip>
      )}
      {data && (
        <React.Fragment>
          <Item label="CPU" percent={data.cpu} title={t('CPU使用率')}/>
          {gpu && <Item label="GPU" percent={gpu.percent}
                        title={`${t('显存')} ${gpu.memory_used}/${gpu.memory_total}GB`}/>}
          {data.memory && <Item label={t('内存')} percent={data.memory.percent}
                                title={`${data.memory.used}/${data.memory.total}GB`}/>}
          {data.swap && !data.swap.disabled && (
            <Item label="Swap" percent={data.swap.percent}
                  title={`${data.swap.used}/${data.swap.total}GB`}/>
          )}
          {data.swap && data.swap.disabled && (
            <Tooltip title={t('该主机未启用Swap')}>
              <div className={styles.metricItem}>
                <span className={styles.metricLabel}>Swap</span>
                <span style={{fontSize: 11, color: '#999'}}>{t('未启用')}</span>
              </div>
            </Tooltip>
          )}
          {disk && <Item label={t('磁盘')} percent={disk.percent}
                         title={`${disk.mount} ${disk.used}/${disk.total}GB`}/>}
          {network && (
            <Tooltip title={t('实时网速（所有接口合计）')}>
              <div className={styles.metricItem}>
                <span className={styles.metricLabel}>{t('网络')}</span>
                <span style={{fontSize: 11}}>
                  <span style={{color: '#52c41a'}}>↓{fmtSpeed(network.rx_speed)}</span>
                  <span style={{color: '#1890ff', marginLeft: 6}}>↑{fmtSpeed(network.tx_speed)}</span>
                </span>
              </div>
            </Tooltip>
          )}
        </React.Fragment>
      )}
    </div>
  )
}
