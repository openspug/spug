/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import { observable } from "mobx";
import http from 'libs/http';

class Store {
  @observable records = [];
  @observable deploys = [];
  @observable types = [];
  @observable record = {};
  @observable refs = {};
  @observable isLoading = false;
  @observable isFetching = false;
  @observable addVisible = false;
  @observable ext1Visible = false;
  @observable ext2Visible = false;
  @observable approveVisible = false;

  @observable f_app_id;
  @observable f_env_id;
  @observable f_s_date;
  @observable f_e_date;

  fetchRecords = () => {
    this.isFetching = true;
    http.get('/api/deploy/request/')
      .then(res => this.records = res)
      .finally(() => this.isFetching = false)
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
