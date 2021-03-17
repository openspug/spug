/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import { observable, computed } from "mobx";
import http from 'libs/http';
import lds from 'lodash';

class Store {
  @observable records = [];
  @observable record = {};
  @observable counter = {};
  @observable box = null;
  @observable tabs = [];
  @observable tabModes = {};
  @observable isFetching = false;
  @observable addVisible = false;
  @observable ext1Visible = false;
  @observable ext2Visible = false;
  @observable approveVisible = false;
  @observable rbVisible = false;

  @observable f_status = 'all';
  @observable f_app_id;
  @observable f_env_id;
  @observable f_s_date;
  @observable f_e_date;

  @computed get dataSource() {
    let data = this.records;
    if (this.f_app_id) data = data.filter(x => x.app_id === this.f_app_id)
    if (this.f_env_id) data = data.filter(x => x.env_id === this.f_env_id)
    if (this.f_s_date) data = data.filter(x => {
        const date = x.created_at.substr(0, 10);
        return date >= this.f_s_date && date <= this.f_e_date
      })
    if (this.f_status !== 'all') {
      if (this.f_status === '99') {
        data = data.filter(x => ['-1', '2'].includes(x.status))
      } else {
        data = data.filter(x => x.status === this.f_status)
      }
    }
    return data
  }

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
    if (data && data.length === 2) {
      this.f_s_date = data[0].format('YYYY-MM-DD');
      this.f_e_date = data[1].format('YYYY-MM-DD')
    } else {
      this.f_s_date = null;
      this.f_e_date = null
    }
  };

  confirmAdd = (deploy) => {
    this.record = {deploy_id: deploy.id, app_host_ids: deploy.host_ids};
    if (deploy.extend === '1') {
      this.ext1Visible = true
    } else {
      this.ext2Visible = true
    }
    this.addVisible = false
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
  };

  showConsole = (info, isClose) => {
    const index = lds.findIndex(this.tabs, x => x.id === info.id);
    if (isClose) {
      if (index !== -1) {
        this.tabs.splice(index, 1)
        delete this.tabModes[info.id]
      }
    } else if (index === -1) {
      this.tabModes[info.id] = true
      this.tabs.push(info)
    }
  };

  readConsole = (info) => {
    this.tabModes[info.id] = false
    const index = lds.findIndex(this.tabs, x => x.id === info.id);
    if (index === -1) {
      info = Object.assign({}, info, {mode: 'read'})
      this.tabs.push(info)
    }
  }
}

export default new Store()
