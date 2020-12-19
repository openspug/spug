/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import { observable, computed } from 'mobx';
import { message } from 'antd';
import http from 'libs/http';
import lds from 'lodash';

class Store {
  @observable records = [];
  @observable treeData = [];
  @observable groups = [];
  @observable group = {};
  @observable record = {};
  @observable idMap = {};
  @observable addByCopy = true;
  @observable grpFetching = true;
  @observable isFetching = false;
  @observable formVisible = false;
  @observable importVisible = false;
  @observable detailVisible = false;
  @observable selectorVisible = false;

  @observable f_name;
  @observable f_host;

  @computed get counter() {
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
    return counter
  }

  @computed get selfTreeData() {
    const treeData = lds.cloneDeep(this.treeData);
    for (let item of treeData) {
      this._updateCounter(item, true)
    }
    return treeData
  }

  @computed get allTreeData() {
    const treeData = lds.cloneDeep(this.treeData);
    for (let item of treeData) {
      this._updateCounter(item, false)
    }
    return treeData
  }

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
      })
      .finally(() => this.isFetching = false)
  };

  fetchGroups = () => {
    this.grpFetching = true;
    return http.get('/api/host/group/')
      .then(res => {
        this.treeData = res.treeData;
        this.groups = res.groups;
        if (!this.group.key) this.group = this.treeData[0];
      })
      .finally(() => this.grpFetching = false)
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

  showDetail = (info) => {
    this.record = info;
    this.detailVisible = true;
  }

  showSelector = (addByCopy) => {
    this.addByCopy = addByCopy;
    this.selectorVisible = true;
  }

  _updateCounter = (item, isSelf) => {
    let host_ids = this.counter[item.key] || [];
    for (let child of item.children) {
      const ids = this._updateCounter(child, isSelf)
      if (!isSelf) host_ids = host_ids.concat(ids)
    }
    item.host_ids = Array.from(new Set(host_ids));
    return item.host_ids
  }
}

export default new Store()
