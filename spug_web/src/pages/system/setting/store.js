/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import { observable, computed } from "mobx";
import http from 'libs/http';

class Store {
  @observable settings = {};
  @observable isFetching = false;
  @observable loading = false;
  @observable importVisible = false;
  @observable records = [];
  @observable f_name;

  @computed get dataSource() {
    let records = this.records;
    if (this.f_name) records = records.filter(x => x.cn.toLowerCase().includes(this.f_name.toLowerCase()));
    return records
  }


  fetchSettings = () => {
    this.isFetching = true;
    http.get('/api/setting/')
      .then(res => this.settings = res)
      .finally(() => this.isFetching = false)
  };

  update = (key, value) => {
    this.settings[key] = value
  }


  fetchLdapRecords = () => {
    this.isFetching = true;
    http.get('/api/setting/ldap/')
      .then((res) => {
        this.records = res;
      })
      .finally(() => this.isFetching = false)
  };


  handleLdapImport = () => {
    this.importVisible = true;
    this.fetchLdapRecords();
  }
}

export default new Store()
