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
  @observable types = [];
  @observable record = {};
  @observable targets = [undefined];
  @observable isFetching = false;
  @observable formVisible = false;
  @observable infoVisible = false;
  @observable recordVisible = false;

  @observable f_status;
  @observable f_name;
  @observable f_type;

  fetchRecords = () => {
    this.isFetching = true;
    http.get('/api/schedule/')
      .then(({types, tasks}) => {
        tasks.map(item => {
          const value = item['latest_run_time'];
          item['latest_run_time_alias'] = value ? moment(value).fromNow() : null;
          return null
        });
        this.records = tasks;
        this.types = types
      })
      .finally(() => this.isFetching = false)
  };

  showForm = (info = {rst_notify: {mode: '0'}}) => {
    this.formVisible = true;
    this.record = info
  };

  showInfo = (info, h_id = 'latest') => {
    if (info) this.record = info;
    this.record.h_id = h_id;
    this.infoVisible = true
  };

  showRecord = (info) => {
    this.recordVisible = true;
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
