/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import { observable, computed } from 'mobx';
import http from 'libs/http';

class Store {
  @observable records = [];
  @observable treeData = [];
  @observable groups = [];
  @observable group = {};
  @observable record = {};
  @observable idMap = {};
  @observable grpFetching = true;
  @observable isFetching = false;
  @observable formVisible = false;
  @observable importVisible = false;
  @observable detailVisible = false;

  @observable f_name;
  @observable f_host;

  @computed get dataSource() {
    let records = [];
    if (this.group.host_ids) records = this.records.filter(x => this.group.host_ids.includes(x.id));
    if (this.f_name) records = records.filter(x => x.name.toLowerCase().includes(this.f_name.toLowerCase()));
    if (this.f_host) records = records.filter(x => x.hostname.toLowerCase().includes(this.f_host.toLowerCase()));
    return records
  }

  fetchRecords = () => {
    this.isFetching = true;
    return http.get('/api/host/')
      .then(res => {
        this.records = res;
        for (let item of this.records) {
          this.idMap[item.id] = item
        }
        this._updateGroupCount()
      })
      .finally(() => this.isFetching = false)
  };

  fetchGroups = () => {
    this.grpFetching = true;
    http.get('/api/host/group/')
      .then(res => {
        this.treeData = res.treeData;
        this.groups = res.groups;
        if (!this.group.key) this.group = this.treeData[0];
        this._updateGroupCount()
      })
      .finally(() => this.grpFetching = false)
  }

  showForm = (info = {}) => {
    this.formVisible = true;
    this.record = info
  }

  showDetail = (info) => {
    this.record = info;
    this.detailVisible = true;
  }

  _updateGroupCount = () => {
    if (this.treeData.length && this.records.length) {
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
      for (let item of this.treeData) {
        this._updateCount(counter, item)
      }
    }
  }

  _updateCount = (counter, item) => {
    let host_ids = counter[item.key] || [];
    for (let child of item.children) {
      host_ids = host_ids.concat(this._updateCount(counter, child))
    }
    item.host_ids = Array.from(new Set(host_ids));
    if (item.key === this.group.key) this.group = item;
    return item.host_ids
  }
}

export default new Store()
