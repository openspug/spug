/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import { computed, observable } from 'mobx';
import { http, includes, t } from 'libs';
import { message } from 'antd';
import S from './console/store';
import lds from 'lodash';

// 与 PipeHistory.STATUS 一一对应：执行中 / 成功 / 失败 / 已中断
export const STATUS_COLORS = ['blue', 'green', 'red', 'orange'];

class Store {
  @observable records = [];
  @observable record = {nodes: []};
  @observable nodes = [];
  @observable node = {};
  @observable actionNode = {};
  @observable isFetching = true;
  @observable histories = [];
  @observable historyVisible = false;
  @observable historyFetching = false;

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
        message.success(t('保存成功'))
      })
  }

  showConsole = (record) => {
    this.record = record
    return http.post('/api/pipeline/do/', {id: record.id})
      .then(res => {
        S.record = record
        S.token = res.token
        S.nodes = res.nodes
        S.node = lds.cloneDeep(res.nodes[0])
        S.outputs = {}
        S.dynamicParams = res.dynamic_params ? res.dynamic_params : null
        S.readonly = false
        S.wsIndex = 0
      })
  }

  fetchHistories = (id) => {
    this.historyFetching = true;
    return http.get('/api/pipeline/history/', {params: {pipeline_id: id}})
      .then(res => this.histories = res)
      .finally(() => this.historyFetching = false)
  }

  showHistories = (record) => {
    this.record = record
    this.histories = []
    this.historyVisible = true
    this.fetchHistories(record.id)
  }

  showHistoryConsole = (info) => {
    return http.get(`/api/pipeline/history/${info.id}/`)
      .then(res => {
        // 升级前的记录没有节点快照，控制台没有东西可还原，直接提示而不是开个空壳
        if (!res.nodes || !res.nodes.length) {
          message.warning(t('该执行记录没有可回放的内容'))
          return
        }
        this.historyVisible = false
        S.record = this.record
        S.token = res.token
        S.nodes = res.nodes
        S.node = lds.cloneDeep(res.nodes[0])
        S.outputs = res.outputs
        S.dynamicParams = null
        // 仍在执行中的记录继续接 websocket，其余只做回放
        S.readonly = res.status !== 0
        S.wsIndex = res.index
      })
  }
}

export default new Store()
