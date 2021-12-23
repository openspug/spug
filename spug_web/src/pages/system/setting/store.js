/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import { observable } from "mobx";
import http from 'libs/http';

class Store {
  @observable settings = {};
  @observable isFetching = false;
  @observable loading = false;

  fetchSettings = () => {
    this.isFetching = true;
    http.get('/api/setting/')
      .then(res => this.settings = res)
      .finally(() => this.isFetching = false)
  };

  update = (key, value) => {
    this.settings[key] = value
  }
}

export default new Store()
