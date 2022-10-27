/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import { observable, computed } from 'mobx';
import http from 'libs/http';
import codes from './codes';
import lds from 'lodash';

class Store {
  allPerms = {};
  initPerms = {};
  @observable records = [];
  @observable record = {};
  @observable permissions = lds.cloneDeep(codes);
  @observable deployRel = {};
  @observable isFetching = false;
  @observable formVisible = false;
  @observable pagePermVisible = false;
  @observable deployPermVisible = false;
  @observable hostPermVisible = false;

  @observable f_name;

  @computed get dataSource() {
    let records = this.records;
    if (this.f_name) records = records.filter(x => x.name.toLowerCase().includes(this.f_name.toLowerCase()));
    return records
  }

  constructor() {
    this.initPermissions()
  }

  @computed get idMap() {
    const tmp = {}
    for (let item of this.records) {
      tmp[item.id] = item
    }
    return tmp
  }

  fetchRecords = () => {
    this.isFetching = true;
    return http.get('/api/account/role/')
      .then(res => this.records = res)
      .finally(() => this.isFetching = false)
  };

  initPermissions = () => {
    for (let mod of codes) {
      this.initPerms[mod.key] = {};
      for (let page of mod.pages) {
        this.initPerms[mod.key][page.key] = [];
        this.allPerms[`${mod.key}.${page.key}`] = page.perms.map(x => x.key)
      }
    }
  };

  showForm = (info = {}) => {
    this.formVisible = true;
    this.record = info
  };

  showPagePerm = (info) => {
    this.record = info;
    this.pagePermVisible = true;
    this.permissions = lds.merge({}, this.initPerms, info.page_perms)
  };

  showDeployPerm = (info) => {
    this.record = info;
    this.deployPermVisible = true;
    this.deployRel = info.deploy_perms || {}
  };

  showHostPerm = (info) => {
    this.record = info;
    this.hostPermVisible = true
  }
}

export default new Store()
