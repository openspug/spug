/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import { observable, computed } from 'mobx';
import http from 'libs/http';

class Store {
  @observable tab = 'mcp';

  @observable mcpRecords = [];
  @observable mcpRecord = {};
  @observable mcpFetching = false;
  @observable mcpFormVisible = false;

  @observable skillRecords = [];
  @observable skillRecord = {};
  @observable skillFetching = false;
  @observable skillFormVisible = false;

  @observable f_name = '';

  @computed get mcpDataSource() {
    let records = this.mcpRecords;
    if (this.f_name) records = records.filter(x => x.name.toLowerCase().includes(this.f_name.toLowerCase()));
    return records
  }

  @computed get skillDataSource() {
    let records = this.skillRecords;
    if (this.f_name) records = records.filter(x => x.name.toLowerCase().includes(this.f_name.toLowerCase()));
    return records
  }

  fetchMcpRecords = () => {
    this.mcpFetching = true;
    return http.get('/api/ai/mcp/')
      .then(res => this.mcpRecords = res)
      .finally(() => this.mcpFetching = false)
  };

  fetchSkillRecords = () => {
    this.skillFetching = true;
    return http.get('/api/ai/skill/')
      .then(res => this.skillRecords = res)
      .finally(() => this.skillFetching = false)
  };

  showMcpForm = (info = {}) => {
    this.mcpFormVisible = true;
    this.mcpRecord = info
  };

  showSkillForm = (info = {}) => {
    this.skillFormVisible = true;
    this.skillRecord = info
  }
}

export default new Store()
