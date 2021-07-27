/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import { observable, computed } from 'mobx';
import { message } from 'antd';
import { http, includes } from 'libs';
import lds from 'lodash';

class Store {
  counter = {};
  @observable records = null;
  @observable treeData = [];
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

  @computed get dataSource() {
    let records = [];
    if (this.group.all_host_ids) records = this.records ? this.records.filter(x => this.group.all_host_ids.includes(x.id)) : [];
    if (this.f_word) records = records.filter(x => includes(x.name, this.f_word) || includes(x.public_ip_address, this.f_word) || includes(x.private_ip_address, this.f_word));
    if (this.f_status !== '') records = records.filter(x => this.f_status === x.is_verified);
    return records
  }

  fetchRecords = () => {
    this.isFetching = true;
    return http.get('/api/host/')
      .then(res => {
        const tmp = {};
        this.records = res;
        this.records.map(item => tmp[item.id] = item);
        this.idMap = tmp;
        this._makeCounter();
        this.refreshCounter()
      })
      .finally(() => this.isFetching = false)
  };

  fetchGroups = () => {
    this.grpFetching = true;
    return http.get('/api/host/group/')
      .then(res => {
        this.groups = res.groups;
        this.refreshCounter(res.treeData)
      })
      .finally(() => this.grpFetching = false)
  }

  initial = () => {
    this.isFetching = true;
    this.grpFetching = true;
    return http.all([http.get('/api/host/'), http.get('/api/host/group/')])
      .then(http.spread((res1, res2) => {
        this.records = res1;
        this.records.map(item => this.idMap[item.id] = item);
        this.group = res2.treeData[0] || {};
        this.groups = res2.groups;
        this._makeCounter();
        this.refreshCounter(res2.treeData)
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

  refreshCounter = (treeData) => {
    treeData = treeData || lds.cloneDeep(this.treeData);
    if (treeData.length && this.records !== null) {
      for (let item of treeData) {
        this._refreshCounter(item)
      }
      this.treeData = treeData
    }
  }

  _refreshCounter = (item) => {
    item.all_host_ids = item.self_host_ids = this.counter[item.key] || [];
    for (let child of item.children) {
      const ids = this._refreshCounter(child)
      item.all_host_ids = item.all_host_ids.concat(ids)
    }
    item.all_host_ids = Array.from(new Set(item.all_host_ids));
    if (this.group.key === item.key) this.group = item;
    return item.all_host_ids
  }

  _makeCounter = () => {
    const counter = {};
    for (let host of this.records) {
      for (let id of host.group_ids) {
        if (counter[id]) {
          counter[id].push(host.id)
        } else {
          counter[id] = [host.id]
        }
      }
    }
    this.counter = counter
  }
}

export default new Store()
