/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import { observable, computed } from 'mobx';
import http from 'libs/http';
import moment from 'moment';
import lds from 'lodash';

class Store {
  @observable records = [];
  @observable record = {};
  @observable types = [];
  @observable groups = [];
  @observable page = 0;
  @observable isFetching = false;
  @observable formVisible = false;

  @observable f_name;
  @observable f_type;
  @observable f_active = '';
  @observable f_group;

  @computed get dataSource() {
    let records = this.records;
    if (this.f_active) records = records.filter(x => x.is_active === (this.f_active === '1'));
    if (this.f_name) records = records.filter(x => x.name.toLowerCase().includes(this.f_name.toLowerCase()));
    if (this.f_type) records = records.filter(x => x.type_alias === this.f_type);
    if (this.f_group) records = records.filter(x => x.group === this.f_group);
    return records
  }

  fetchRecords = () => {
    this.isFetching = true;
    http.get('/api/monitor/')
      .then(({groups, detections}) => {
        const tmp = new Set();
        detections.map(item => {
          tmp.add(item['type_alias']);
          const value = item['latest_run_time'];
          item['latest_run_time_alias'] = value ? moment(value).fromNow() : null;
          return null
        });
        this.types = Array.from(tmp);
        this.records = detections;
        this.groups = groups;
      })
      .finally(() => this.isFetching = false)
  };

  showForm = (info) => {
    info = info || {type: '1', targets: []};
    this.page = 0;
    this.record = lds.cloneDeep(info);
    this.formVisible = true;
  }
}

export default new Store()
