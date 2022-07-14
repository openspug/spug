/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import { observable, computed } from 'mobx';
import { http, includes } from 'libs';

class Store {
  @observable records = [];
  @observable isFetching = false;

  @observable f_ip;
  @observable f_name;
  @observable f_status = '';

  @computed get dataSource() {
    let records = this.records;
    if (this.f_ip) records = records.filter(x => includes(x.ip, this.f_ip));
    if (this.f_name) records = records.filter(x => includes(x.username, this.f_name));
    if (this.f_status) records = records.filter(x => String(x.is_success) === this.f_status);
    return records
  }

  fetchRecords = () => {
    this.isFetching = true;
    http.get('/api/account/login/history/')
      .then(res => this.records = res)
      .finally(() => this.isFetching = false)
  };
}

export default new Store()
