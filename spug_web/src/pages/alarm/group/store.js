/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import { observable, computed } from 'mobx';
import http from 'libs/http';

class Store {
  @observable records = [];
  @observable record = {};
  @observable isFetching = false;
  @observable formVisible = false;

  @observable f_name;

  @computed get dataSource() {
    let records = this.records;
    if (this.f_name) records = records.filter(x => x.name.toLowerCase().includes(this.f_name.toLowerCase()));
    if (this.f_type) records = records.filter(x => x.type.toLowerCase().includes(this.f_type.toLowerCase()));
    return records
  }

  fetchRecords = () => {
    this.isFetching = true;
    return http.get('/api/alarm/group/')
      .then(res => this.records = res)
      .finally(() => this.isFetching = false)
  };

  showForm = (info = {}) => {
    this.formVisible = true;
    this.record = info
  }
}

export default new Store()
