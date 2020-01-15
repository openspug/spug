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
  @observable idMap = {};
  @observable isFetching = false;
  @observable formVisible = false;

  @observable f_name;

  fetchRecords = () => {
    this.isFetching = true;
    return http.get('/api/config/environment/')
      .then(res => {
        this.records = res;
        for (let item of res) {
          this.idMap[item.id] = item
        }
      })
      .finally(() => this.isFetching = false)
  };

  showForm = (info = {}) => {
    this.formVisible = true;
    this.record = info
  }
}

export default new Store()
