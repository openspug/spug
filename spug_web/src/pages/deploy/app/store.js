/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import { observable } from "mobx";
import http from 'libs/http';

class Store {
  @observable records = {};
  @observable record = {};
  @observable deploy = {};
  @observable page = 0;
  @observable loading = {};
  @observable isReadOnly = false;
  @observable isFetching = false;
  @observable formVisible = false;
  @observable addVisible = false;
  @observable ext1Visible = false;
  @observable ext2Visible = false;

  @observable f_name;
  @observable f_desc;

  fetchRecords = () => {
    this.isFetching = true;
    http.get('/api/app/')
      .then(res => {
        const tmp = {};
        for (let item of res) {
          tmp[item.id] = item
        }
        this.records = tmp
      })
      .finally(() => this.isFetching = false)
  };

  loadDeploys = (app_id) => {
    return http.get('/api/app/deploy/', {params: {app_id}})
      .then(res => this.records[app_id]['deploys'] = res)
  };

  showForm = (e, info) => {
    if (e) e.stopPropagation();
    this.record = info || {};
    this.formVisible = true;
  };

  showExtForm = (e, app_id, info, isClone, isReadOnly = false) => {
    if (e) e.stopPropagation();
    this.page = 0;
    this.app_id = app_id;
    this.isReadOnly = isReadOnly
    if (info) {
      if (info.extend === '1') {
        this.ext1Visible = true
      } else {
        this.ext2Visible = true
      }
      isClone && delete info.id;
      this.deploy = info
    } else {
      this.addVisible = true;
    }
  };

  addHost = () => {
    this.deploy['host_ids'].push(undefined)
  };

  editHost = (index, v) => {
    this.deploy['host_ids'][index] = v
  };

  delHost = (index) => {
    this.deploy['host_ids'].splice(index, 1)
  }
}

export default new Store()
