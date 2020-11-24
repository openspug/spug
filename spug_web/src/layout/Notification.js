import React, { useState, useEffect } from 'react';
import { Menu, List, Dropdown, Badge } from 'antd';
import { CheckOutlined, NotificationOutlined } from '@ant-design/icons';
import { http } from 'libs';
import moment from 'moment';
import styles from './layout.module.less';

let interval;

export default function () {
  const [loading, setLoading] = useState(false);
  const [notifies, setNotifies] = useState([]);
  const [reads, setReads] = useState([]);

  useEffect(() => {
    fetch();
    interval = setInterval(fetch, 60000);
    return () => {
      if (interval) clearInterval(interval)
    }
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

  function handleRead(e, item) {
    e.stopPropagation();
    if (reads.indexOf(item.id) === -1) {
      reads.push(item.id);
      setReads(reads)
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
                    avatar={<CheckOutlined type={item.source} style={{fontSize: 24, color: '#1890ff'}}/>}
                    title={<span style={{fontWeight: 400, color: '#404040'}}>{item.title}</span>}
                    description={[
                      <div key="1" style={{fontSize: 12}}>{item.content}</div>,
                      <div key="2" style={{fontSize: 12}}>{moment(item['created_at']).fromNow()}</div>
                    ]}/>
                </List.Item>
              )}/>
            {notifies.length !== 0 && (
              <div className={styles.footer} onClick={handleReadAll}>全部 已读</div>
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