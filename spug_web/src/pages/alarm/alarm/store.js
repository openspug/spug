/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import { observable } from "mobx";
import http from 'libs/http';

class Store {
  @observable records = [];
  @observable isFetching = false;

  @observable f_name;

  fetchRecords = () => {
    this.isFetching = true;
    http.get('/api/alarm/alarm/')
      .then(res => this.records = res)
      .finally(() => this.isFetching = false)
  };
}

export default new Store()
