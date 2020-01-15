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
  @observable isLoading = false;
  @observable isFetching = false;
  @observable addVisible = false;
  @observable ext1Visible = false;
  @observable ext2Visible = false;
  @observable approveVisible = false;

  @observable f_name;
  @observable f_app_name;

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
