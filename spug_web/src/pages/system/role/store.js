import { observable } from "mobx";
import http from 'libs/http';
import codes from './codes';
import lds from 'lodash';

class Store {
  allPerms = {};
  @observable records = [];
  @observable record = {};
  @observable permissions = lds.cloneDeep(codes);
  @observable deployRel = {}
  @observable isFetching = false;
  @observable formVisible = false;
  @observable pagePermVisible = false;
  @observable deployPermVisible = true;

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
    const tmp = {};
    for (let mod of codes) {
      tmp[mod.key] = {};
      for (let page of mod.pages) {
        tmp[mod.key][page.key] = [];
        this.allPerms[`${mod.key}.${page.key}`] = page.perms.map(x => x.key)
      }
    }
    this.permissions = tmp;
  };

  showForm = (info = {}) => {
    this.formVisible = true;
    this.record = info
  };

  showPagePerm = (info) => {
    this.record = info;
    this.pagePermVisible = true;
  };

  showDeployPerm = (info) => {
    this.record = info;
    this.deployPermVisible = true;
  }
}

export default new Store()