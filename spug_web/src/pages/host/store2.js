/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import { observable, computed, toJS } from 'mobx';
import { includes } from 'libs';

class Store {
  @observable rawTreeData = [];
  @observable rawRecords = [];
  @observable group = {};
  @observable onlySelf = false;

  @observable f_word;

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
    if (!this.onlySelf) {
      for (let item of this.rawTreeData) {
        this._handler_counter(item, counter)
      }
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
      if (host_ids?.size > 0 || item.key === this.group.key) {
        item.children = this._handle_filter_group(item.children)
        data.push(item)
      }
    }
    return data
  }
}

export default new Store()
