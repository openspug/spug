import React, { useState, useEffect } from 'react';
import { Menu, List, Dropdown, Badge, Button, notification } from 'antd';
import { NotificationOutlined, MonitorOutlined, FlagOutlined, ScheduleOutlined } from '@ant-design/icons';
import { http, X_TOKEN } from 'libs';
import moment from 'moment';
import styles from './layout.module.less';

let ws = {readyState: 3};
let timer;


function Icon(props) {
  switch (props.type) {
    case 'monitor':
      return <MonitorOutlined style={{fontSize: 24, color: '#1890ff'}}/>
    case 'schedule':
      return <ScheduleOutlined style={{fontSize: 24, color: '#1890ff'}}/>
    case 'flag':
      return <FlagOutlined style={{fontSize: 24, color: '#1890ff'}}/>
    default:
      return null
  }
}

export default function () {
  const [loading, setLoading] = useState(false);
  const [notifies, setNotifies] = useState([]);
  const [reads, setReads] = useState([]);

  useEffect(() => {
    fetch();
    listen();
    timer = setInterval(() => {
      if (ws.readyState === 1) {
        ws.send('ping')
      } else if (ws.readyState === 3) {
        listen()
      }
    }, 10000)
    return () => {
      if (timer) clearInterval(timer);
      if (ws.close) ws.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function fetch() {
    setLoading(true);
    http.get('/api/notify/')
      .then(res => {
        setNotifies(res);
        setReads([])
      })
      .finally(() => setLoading(false))
  }

  function listen() {
    if (!X_TOKEN) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}/api/ws/notify/?x-token=${X_TOKEN}`);
    ws.onopen = () => ws.send('ok');
    ws.onmessage = e => {
      if (e.data === 'pong') {
      } else {
        fetch();
        const {title, content} = JSON.parse(e.data);
        const key = `open${Date.now()}`;
        const description = <div style={{whiteSpace: 'pre-wrap'}}>{content}</div>;
        const btn = <Button type="primary" size="small" onClick={() => notification.close(key)}>知道了</Button>;
        notification.warning({message: title, description, btn, key, top: 64, duration: null})
      }
    }
  }

  function handleRead(e, item) {
    e.stopPropagation();
    if (reads.indexOf(item.id) === -1) {
      reads.push(item.id);
      setReads([...reads])
      http.patch('/api/notify/', {ids: [item.id]})
    }
  }

  function handleReadAll() {
    const ids = notifies.map(x => x.id);
    setReads(ids);
    http.patch('/api/notify/', {ids})
  }

  return (
    <div className={styles.right}>
      <Dropdown trigger={['click']} overlay={(
        <Menu className={styles.notify}>
          <Menu.Item style={{padding: 0, whiteSpace: 'unset'}}>
            <List
              loading={loading}
              style={{maxHeight: 500, overflow: 'scroll'}}
              itemLayout="horizontal"
              dataSource={notifies}
              renderItem={item => (
                <List.Item className={styles.item} onClick={e => handleRead(e, item)}>
                  <List.Item.Meta
                    style={{opacity: reads.includes(item.id) ? 0.4 : 1}}
                    avatar={<Icon type={item.source}/>}
                    title={<span style={{fontWeight: 400, color: '#404040'}}>{item.title}</span>}
                    description={[
                      <div key="1" style={{fontSize: 12}}>{item.content}</div>,
                      <div key="2" style={{fontSize: 12}}>{moment(item['created_at']).fromNow()}</div>
                    ]}/>
                </List.Item>
              )}/>
            {notifies.length !== 0 && (
              <div className={styles.btn} onClick={handleReadAll}>全部 已读</div>
            )}
          </Menu.Item>
        </Menu>
      )}>
        <span className={styles.trigger}>
          <Badge count={notifies.length - reads.length}>
            <NotificationOutlined style={{fontSize: 16}}/>
          </Badge>
        </span>
      </Dropdown>
    </div>
  )
}