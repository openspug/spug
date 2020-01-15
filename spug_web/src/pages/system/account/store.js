/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import { observable } from "mobx";
import http from 'libs/http';

class Store {
  @observable records = [];
  @observable record = {};
  @observable isFetching = false;
  @observable formVisible = false;

  @observable f_name;
  @observable f_status;

  fetchRecords = () => {
    this.isFetching = true;
    http.get('/api/account/user/')
      .then(res => this.records = res)
      .finally(() => this.isFetching = false)
  };

  showForm = (info = {}) => {
    this.formVisible = true;
    this.record = info
  }
}

export default new Store()
