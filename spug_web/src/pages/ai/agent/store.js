/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import { observable, computed } from 'mobx';
import http from 'libs/http';
import { X_TOKEN } from 'libs/functools';

class Store {
  @observable sessions = [];
  @observable current = null;      // 当前会话详情（含 records）
  @observable hosts = [];
  @observable isFetching = false;
  @observable sending = false;
  @observable streaming = '';      // 模型正在输出的增量文本
  @observable pending = null;      // 待用户确认的高危命令

  @observable mode = 'chat';       // chat | agent
  @observable hostId = undefined;
  @observable f_word = '';

  es = null;                       // EventSource 实例

  @computed get sessionList() {
    if (!this.f_word) return this.sessions;
    const word = this.f_word.toLowerCase();
    return this.sessions.filter(x => (x.title || '').toLowerCase().includes(word))
  }

  @computed get currentHost() {
    if (!this.hostId) return null;
    return this.hosts.find(x => x.id === this.hostId) || null
  }

  fetchSessions = () => {
    this.isFetching = true;
    return http.get('/api/ai/session/')
      .then(res => {
        this.sessions = res;
        return res
      })
      .finally(() => this.isFetching = false)
  };

  fetchHosts = () => {
    return http.get('/api/host/')
      .then(res => this.hosts = res.filter(x => x.is_verified))
  };

  fetchDetail = (id, syncSelection = true) => {
    return http.get('/api/ai/session/', {params: {id}})
      .then(res => {
        this.current = res;
        // 轮询刷新时不要覆盖用户正在调整的模式与服务器选择
        if (syncSelection) {
          this.mode = res.mode === 'chat' ? 'chat' : 'agent';
          this.hostId = res.host_id || undefined;
        }
        // 会话挂起在待确认命令上时，恢复确认提示
        this.pending = res.status === 'waiting' ? res.pending : null;
        return res
      })
  };

  selectSession = (item) => {
    if (this.current && this.current.id === item.id) return;
    this.closeStream();
    this.sending = false;
    this.streaming = '';
    this.pending = null;
    return this.fetchDetail(item.id).then(res => {
      // 会话仍在执行中（如告警自动修复），继续跟随其实时输出
      if (res.status === 'running') this.openStream(res.id, 0);
      return res
    })
  };

  newSession = () => {
    return http.post('/api/ai/session/', {
      title: '新对话',
      mode: this.mode === 'chat' ? 'chat' : 'repair',
      host_id: this.mode === 'chat' ? undefined : this.hostId,
    }).then(res => {
      res.records = [];
      this.current = res;
      this.sessions = [res, ...this.sessions];
      return res
    })
  };

  send = (question) => {
    this.sending = true;
    this.streaming = '';
    this.pending = null;
    const prepare = this.current && this.current.id
      ? Promise.resolve(this.current)
      : this.newSession();

    return prepare
      .then(session => {
        // 本地先插入提问，等待期间界面不空白
        this.current.records = [...(this.current.records || []), {
          id: `tmp-${Date.now()}`, kind: 'question', kind_alias: '用户提问',
          content: question, turn: -1,
        }];
        return http.post('/api/ai/session/chat/', {
          id: session.id,
          question,
          mode: this.mode,
          host_id: this.mode === 'chat' ? null : this.hostId,
        }).then(() => session.id)
      })
      .then(sessionId => this.openStream(sessionId))
      .catch(err => {
        this.sending = false;
        this.current.records = (this.current.records || [])
          .filter(x => String(x.id).indexOf('tmp-') !== 0);
        return Promise.reject(err)
      })
  };

  /** 建立 SSE 连接，实时接收模型增量与命令执行事件
   *  grace: 会话尚未进入 running 时，允许服务端多等几秒，避免竞态误判为已结束 */
  openStream = (sessionId, grace = 8) => {
    this.closeStream();
    this.sending = true;
    return new Promise(resolve => {
      const url = `/api/ai/session/stream/?id=${sessionId}&grace=${grace}&x-token=${X_TOKEN}`;
      const es = new EventSource(url);
      this.es = es;
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        this.closeStream();
        this.sending = false;
        this.streaming = '';
        // 收尾时拉一次完整详情，保证记录与服务端一致
        this.fetchDetail(sessionId, false)
          .then(() => this.fetchSessions())
          .finally(resolve)
      };

      es.onmessage = (e) => {
        let event;
        try {
          event = JSON.parse(e.data)
        } catch (err) {
          return
        }
        this.applyEvent(event, finish)
      };
      es.onerror = () => finish()
    })
  };

  applyEvent = (event, finish) => {
    switch (event.type) {
      case 'delta':
        // 思考类增量不进气泡，避免与最终回复重复
        if (!event.thinking) this.streaming += event.text || '';
        break;
      case 'delta_reset':
        this.streaming = '';
        break;
      case 'delta_end':
        this.streaming = '';
        break;
      case 'record': {
        const record = event.record;
        if (!record) break;
        const records = (this.current.records || [])
          .filter(x => String(x.id).indexOf('tmp-') !== 0 || x.content !== record.content);
        if (!records.some(x => x.id === record.id)) records.push(record);
        this.current.records = records;
        this.streaming = '';
        if (record.kind === 'confirm') {
          this.pending = {command: record.content, reason: (record.extra || {}).reason}
        }
        break;
      }
      case 'waiting':
        this.pending = {command: event.command, reason: event.reason};
        this.sending = false;
        break;
      case 'done':
        finish();
        break;
      default:
        break
    }
  };

  closeStream = () => {
    if (this.es) {
      this.es.close();
      this.es = null
    }
  };

  /** 确认或拒绝高危命令，随后继续接收流 */
  confirm = (approve) => {
    const sessionId = this.current.id;
    this.pending = null;
    this.sending = true;
    return http.post('/api/ai/session/confirm/', {id: sessionId, approve})
      .then(() => this.openStream(sessionId))
      .catch(err => {
        this.sending = false;
        return Promise.reject(err)
      })
  };

  removeSession = (id) => {
    return http.delete('/api/ai/session/', {params: {id}})
      .then(() => {
        this.sessions = this.sessions.filter(x => x.id !== id);
        if (this.current && this.current.id === id) this.current = null
      })
  };

  reset = () => {
    this.closeStream();
    this.current = null;
    this.mode = 'chat';
    this.hostId = undefined;
    this.sending = false;
    this.streaming = '';
    this.pending = null
  }
}

export default new Store()
