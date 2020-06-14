/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import { observable } from "mobx";
import http from 'libs/http';
import moment from "moment";

class Store {
  @observable records = [];
  @observable record = {};
  @observable types = [];
  @observable isFetching = false;
  @observable formVisible = false;

  @observable f_name;
  @observable f_type;
  @observable f_status;

  fetchRecords = () => {
    this.isFetching = true;
    http.get('/api/monitor/')
      .then(res => {
        const tmp = new Set();
        res.map(item => {
          tmp.add(item['type_alias']);
          const value = item['latest_run_time'];
          item['latest_run_time_alias'] = value ? moment(value).fromNow() : null;
          return null
        });
        this.types = Array.from(tmp);
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
