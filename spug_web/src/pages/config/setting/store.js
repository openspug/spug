/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import { observable } from "mobx";
import http from 'libs/http';

class Store {
  @observable records = [];
  @observable record = {};
  @observable env = {};
  @observable obj = {};
  @observable type;
  @observable id;
  @observable isFetching = false;
  @observable formVisible = false;
  @observable recordVisible = false;
  @observable diffVisible = false;

  @observable f_name;

  initial = (type, id) => {
    this.type = type
    this.id = id
    const url = type === 'app' ? '/api/app/' : '/api/config/service/'
    this.isFetching = true
    return http.get(url, {params: {id}})
      .then(res => this.obj = res)
  }

  fetchRecords = () => {
    const params = {type: this.type, id: this.id, env_id: this.env.id};
    this.isFetching = true;
    return http.get('/api/config/', {params})
      .then(res => this.records = res)
      .finally(() => this.isFetching = false)
  };

  showForm = (info) => {
    this.formVisible = true;
    this.record = info || {};
  };

  showRecord = () => {
    this.recordVisible = true
  };

  showDiff = () => {
    this.diffVisible = true
  }
}

export default new Store()
