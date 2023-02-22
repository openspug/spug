/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import { observable, computed } from 'mobx';
import { http, includes } from 'libs';
import lds from 'lodash';

class Store {
  @observable records = [];
  @observable record = {};
  @observable isFetching = true;
  @observable formVisible = false;

  @observable f_name;
  @observable f_is_public;

  @computed get dataSource() {
    let records = this.records;
    if (this.f_name) records = records.filter(x => includes(x.name, this.f_name));
    if (!lds.isNil(this.f_is_public)) records = records.filter(x => this.f_is_public === x.is_public);
    return records
  }

  fetchRecords = () => {
    this.isFetching = true;
    http.get('/api/credential/')
      .then(res => this.records = res)
      .finally(() => this.isFetching = false)
  };

  showForm = (info = {}) => {
    this.formVisible = true;
    this.record = info
  }
}

export default new Store()
