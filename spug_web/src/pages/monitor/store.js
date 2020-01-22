/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import { observable } from "mobx";
import http from 'libs/http';
import moment from "moment";

class Store {
  @observable records = [];
  @observable record = {};
  @observable isFetching = false;
  @observable formVisible = false;

  @observable f_name;
  @observable f_status;

  fetchRecords = () => {
    this.isFetching = true;
    http.get('/api/monitor/')
      .then(res => {
        res.map(item => {
          const value = item['latest_run_time'];
          item['latest_run_time'] = value ? moment(value).fromNow() : null
        });
        this.records = res
      })
      .finally(() => this.isFetching = false)
  };

  showForm = (info = {}) => {
    this.formVisible = true;
    this.record = info
  }
}

export default new Store()
