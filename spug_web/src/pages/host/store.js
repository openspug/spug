/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import { observable, computed, toJS } from 'mobx';
import { message } from 'antd';
import { http, includes } from 'libs';

class Store {
  @observable rawTreeData = [];
  @observable rawRecords = [];
  @observable groups = {};
  @observable group = {};
  @observable record = {};
  @observable idMap = {};
  @observable addByCopy = true;
  @observable grpFetching = true;
  @observable isFetching = false;
  @observable formVisible = false;
  @observable importVisible = false;
  @observable syncVisible = false;
  @observable cloudImport = null;
  @observable detailVisible = false;
  @observable selectorVisible = false;

  @observable f_word;
  @observable f_status = '';

  @computed get records() {
    let records = this.rawRecords;
    if (this.f_word) {
      records = records.filter(x => {
        if (includes(x.name, this.f_word)) return true
        if (x.public_ip_address && includes(x.public_ip_address[0], this.f_word)) return true
        return !!(x.private_ip_address && includes(x.private_ip_address[0], this.f_word));
      });
    }
    return records
  }

  @computed get dataSource() {
    let records = [];
    if (this.group.key) {
      const host_ids = this.counter[this.group.key]
      records = this.records.filter(x => host_ids && host_ids.has(x.id));
    }
    if (this.f_status !== '') records = records.filter(x => this.f_status === x.is_verified);
    return records
  }

  @computed get counter() {
    const counter = {}
    for (let host of this.records) {
      for (let id of host.group_ids) {
        if (counter[id]) {
          counter[id].add(host.id)
        } else {
          counter[id] = new Set([host.id])
        }
      }
    }
    for (let item of this.rawTreeData) {
      this._handler_counter(item, counter)
    }
    return counter
  }

  @computed get treeData() {
    let treeData = toJS(this.rawTreeData)
    if (this.f_word) {
      treeData = this._handle_filter_group(treeData)
    }
    return treeData
  }

  fetchRecords = () => {
    this.isFetching = true;
    return http.get('/api/host/')
      .then(res => {
        const tmp = {};
        this.rawRecords = res;
        this.rawRecords.map(item => tmp[item.id] = item);
        this.idMap = tmp;
      })
      .finally(() => this.isFetching = false)
  };

  fetchExtend = (id) => {
    http.put('/api/host/', {id})
      .then(() => this.fetchRecords())
  }

  fetchGroups = () => {
    this.grpFetching = true;
    return http.get('/api/host/group/')
      .then(res => {
        this.groups = res.groups;
        this.rawTreeData = res.treeData
      })
      .finally(() => this.grpFetching = false)
  }

  initial = () => {
    if (this.rawRecords.length > 0) return Promise.resolve()
    this.isFetching = true;
    this.grpFetching = true;
    return http.all([http.get('/api/host/'), http.get('/api/host/group/')])
      .then(http.spread((res1, res2) => {
        this.rawRecords = res1;
        this.rawRecords.map(item => this.idMap[item.id] = item);
        this.groups = res2.groups;
        this.rawTreeData = res2.treeData;
        this.group = this.treeData[0] || {};
      }))
      .finally(() => {
        this.isFetching = false;
        this.grpFetching = false
      })
  }

  updateGroup = (group, host_ids) => {
    const form = {host_ids, s_group_id: group.key, t_group_id: this.group.key, is_copy: this.addByCopy};
    return http.patch('/api/host/', form)
      .then(() => {
        message.success('操作成功');
        this.fetchRecords()
      })
  }

  showForm = (info = {}) => {
    this.formVisible = true;
    this.record = info
  }

  showSync = () => {
    this.syncVisible = !this.syncVisible
  }

  showDetail = (info) => {
    this.record = info;
    this.detailVisible = true;
  }

  showSelector = (addByCopy) => {
    this.addByCopy = addByCopy;
    this.selectorVisible = true;
  }

  _handler_counter = (item, counter) => {
    if (!counter[item.key]) counter[item.key] = new Set()
    for (let child of item.children) {
      this._handler_counter(child, counter)
      counter[child.key].forEach(x => counter[item.key].add(x))
    }
  }

  _handle_filter_group = (treeData) => {
    const data = []
    for (let item of treeData) {
      const host_ids = this.counter[item.key]
      if (host_ids.size > 0 || item.key === this.group.key) {
        item.children = this._handle_filter_group(item.children)
        data.push(item)
      }
    }
    return data
  }
}

export default new Store()
