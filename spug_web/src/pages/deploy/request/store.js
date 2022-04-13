/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import { observable, computed } from "mobx";
import http from 'libs/http';
import moment from 'moment';
import lds from 'lodash';

class Store {
  @observable records = [];
  @observable record = {};
  @observable counter = {};
  @observable tabs = [];
  @observable isFetching = false;
  @observable addVisible = false;
  @observable ext1Visible = false;
  @observable ext2Visible = false;
  @observable batchVisible = false;
  @observable approveVisible = false;
  @observable rollbackVisible = false;

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

  fetchInfo = (id) => {
    http.get('/api/deploy/request/info/', {params: {id}})
      .then(res => {
        for (let item of this.records) {
          if (item.id === id) {
            Object.assign(item, res, {key: Date.now()})
            break
          }
        }
      })
      .then(this._updateCounter)
  }

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
    const {id, host_ids, require_upload} = deploy;
    this.record = {deploy_id: id, app_host_ids: host_ids, require_upload};
    if (deploy.extend === '1') {
      this.ext1Visible = true
    } else {
      this.ext2Visible = true
    }
    this.addVisible = false
  };

  rollback = (info) => {
    this.record = lds.pick(info, ['deploy_id', 'host_ids']);
    this.record.app_host_ids = info.host_ids;
    this.record.name = `${info.name} - 回滚`;
    this.rollbackVisible = true
  }

  showForm = (info) => {
    this.record = info;
    if (info.plan) this.record.plan = moment(info.plan);
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
        this.tabs[index] = {}
      }
      this.fetchInfo(info.id)
    } else if (index === -1) {
      this.tabs.push(info)
    }
  };

  readConsole = (info) => {
    const index = lds.findIndex(this.tabs, x => x.id === info.id);
    if (index === -1) {
      info = Object.assign({}, info, {mode: 'read'})
      this.tabs.push(info)
    }
  };

  leaveConsole = () => {
    this.tabs = []
  }
}

export default new Store()
