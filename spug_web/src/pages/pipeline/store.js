/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import { observable } from 'mobx';
import { http } from 'libs';
import { message } from 'antd';

class Store {
  @observable record = {nodes: []};
  @observable nodes = [];
  @observable node = {};
  @observable actionNode = {};
  @observable isFetching = true;

  fetchRecords = (id, isFetching) => {
    this.isFetching = true;
    return http.get('/api/pipline/')
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
}

export default new Store()
