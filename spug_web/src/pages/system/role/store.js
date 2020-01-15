/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import { observable } from "mobx";
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

  @observable f_name;

  constructor() {
    this.initPermissions()
  }

  fetchRecords = () => {
    this.isFetching = true;
    http.get('/api/account/role/')
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
    this.permissions = lds.merge(this.initPerms, info.page_perms)
  };

  showDeployPerm = (info) => {
    this.record = info;
    this.deployPermVisible = true;
    this.deployRel = info.deploy_perms || {}
  }
}

export default new Store()
