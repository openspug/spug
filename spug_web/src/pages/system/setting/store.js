/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
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
      .then(res => {
        for (let item of res) {
          this.settings[item.key] = item
        }
      })
      .finally(() => this.isFetching = false)
  };
}

export default new Store()
