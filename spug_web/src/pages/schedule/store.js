/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import { observable, computed } from 'mobx';
import http from 'libs/http';
import moment from "moment";

class Store {
  @observable records = [];
  @observable types = [];
  @observable record = {};
  @observable page = 0;
  @observable targets = [undefined];
  @observable isFetching = false;
  @observable formVisible = false;
  @observable infoVisible = false;
  @observable recordVisible = false;

  @observable f_status;
  @observable f_active = '';
  @observable f_name;
  @observable f_type;

  @computed get dataSource() {
    let records = this.records;
    if (this.f_active) records = records.filter(x => x.is_active === (this.f_active === '1'));
    if (this.f_name) records = records.filter(x => x.name.toLowerCase().includes(this.f_name.toLowerCase()));
    if (this.f_type) records = records.filter(x => x.type.toLowerCase().includes(this.f_type.toLowerCase()));
    if (this.f_status !== undefined) {
      if (this.f_status === -1) {
        records = records.filter(x => x.is_active && !x.latest_status_alias);
      } else {
        records = records.filter(x => x.latest_status === this.f_status)
      }
    }
    return records
  }

  fetchRecords = () => {
    this.isFetching = true;
    http.get('/api/schedule/')
      .then(res => {
        res.tasks.map(item => {
          const value = item['latest_run_time'];
          item['latest_run_time_alias'] = value ? moment(value).fromNow() : null;
          item['latest_run_time'] = value || '1970-01-01';
          return null
        });
        this.records = res.tasks;
        this.types = res.types
      })
      .finally(() => this.isFetching = false)
  };

  showForm = (info) => {
    this.page = 0;
    this.record = info || {interpreter: 'sh', rst_notify: {mode: '0'}, trigger: 'interval'};
    this.formVisible = true
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

  editTarget = (index, v) => {
    this.targets[index] = v
  };

  delTarget = (index) => {
    this.targets.splice(index, 1)
  }
}

export default new Store()
