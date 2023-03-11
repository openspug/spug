/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import { computed, observable } from 'mobx';
import { http, includes } from 'libs';
import { message } from 'antd';
import S from './console/store';

class Store {
  @observable records = [];
  @observable record = {nodes: []};
  @observable nodes = [];
  @observable node = {};
  @observable actionNode = {};
  @observable isFetching = true;

  @computed get dataSource() {
    let records = this.records;
    if (this.f_name) records = records.filter(x => includes(x.name, this.f_name));
    return records
  }

  fetchRecords = () => {
    this.isFetching = true;
    return http.get('/api/pipeline/')
      .then(res => this.records = res)
      .finally(() => this.isFetching = false)
  }

  fetchRecord = (id) => {
    this.isFetching = true;
    return http.get('/api/pipeline/', {params: {id}})
      .then(res => this.record = res)
      .finally(() => this.isFetching = false)
  }

  updateRecord = () => {
    return http.post('/api/pipeline/', this.record)
      .then(res => {
        this.record = res
        message.success('保存成功')
      })
  }

  showConsole = (record) => {
    this.record = record
    return http.post('/api/pipeline/do/', {id: 1})
      .then(res => {
        S.open = true
        S.nodes = res.nodes
        S.node = res.nodes[0]
        if (res.dynamic_params) {
          S.dynamicParams = res.dynamic_params
        } else {
          S.token = res.token
        }
      })
  }
}

export default new Store()
