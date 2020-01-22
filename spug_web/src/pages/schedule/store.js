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
  @observable types = [];
  @observable record = {};
  @observable targets = [undefined];
  @observable isFetching = false;
  @observable formVisible = false;
  @observable infoVisible = false;

  @observable f_status;
  @observable f_name;
  @observable f_type;

  fetchRecords = () => {
    this.isFetching = true;
    http.get('/api/schedule/')
      .then(({types, tasks}) => {
        tasks.map(item => {
          const value = item['latest_run_time'];
          item['latest_run_time'] = value ? moment(value).fromNow() : null
        });
        this.records = tasks;
        this.types = types
      })
      .finally(() => this.isFetching = false)
  };

  showForm = (info = {}) => {
    this.formVisible = true;
    this.record = info
  };

  showInfo = (info = {}) => {
    this.infoVisible = true;
    this.record = info
  };

  addTarget = () => {
    this.targets.push(undefined)
  };

  editTarget = (index, v) => {
    this.targets[index] = v
  };

  delTarget = (index) => {
    this.targets.splice(index, 1)
  }
}

export default new Store()
