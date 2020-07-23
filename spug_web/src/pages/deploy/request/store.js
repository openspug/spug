/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import { observable } from "mobx";
import http from 'libs/http';

class Store {
  @observable records = [];
  @observable deploys = [];
  @observable types = [];
  @observable record = {};
  @observable refs = {};
  @observable counter = {};
  @observable isLoading = false;
  @observable isFetching = false;
  @observable addVisible = false;
  @observable ext1Visible = false;
  @observable ext2Visible = false;
  @observable approveVisible = false;

  @observable f_status = 'all';
  @observable f_app_id;
  @observable f_env_id;
  @observable f_s_date;
  @observable f_e_date;

  fetchRecords = () => {
    this.isFetching = true;
    http.get('/api/deploy/request/')
      .then(res => this.records = res)
      .then(this._updateCounter)
      .finally(() => this.isFetching = false)
  };

  _updateCounter = () => {
    const counter = {'all': 0, '-3': 0, '0': 0, '1': 0, '3': 0, '99': 0};
    for (let item of this.records) {
      counter['all'] += 1;
      if (['-1', '2'].includes(item['status'])) {
        counter['99'] += 1
      } else {
        counter[item['status']] += 1
      }
    }
    this.counter = counter
  };

  loadDeploys = () => {
    this.isLoading = true;
    http.get('/api/app/deploy/')
      .then(res => this.deploys = res)
      .finally(() => this.isLoading = false)
  };

  updateDate = (data) => {
    if (data.length === 2) {
      this.f_s_date = data[0].format('YYYY-MM-DD');
      this.f_e_date = data[1].format('YYYY-MM-DD')
    } else {
      this.f_s_date = null;
      this.f_e_date = null
    }
  };

  showForm = (info) => {
    this.record = info;
    if (info['app_extend'] === '1') {
      this.ext1Visible = true
    } else {
      this.ext2Visible = true
    }
  };

  showApprove = (info) => {
    this.record = info;
    this.approveVisible = true;
  }
}

export default new Store()
